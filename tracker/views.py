import json
import logging
import os
import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.http import (
    JsonResponse,
    FileResponse
)
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .excel_store import (
    read_jobs,
    read_search_jobs,
    export_search_excel,
    get_search_history,
)

log = logging.getLogger(__name__)


def dashboard(request):
    jobs = []

    try:
        jobs = read_jobs(
            settings.DATA_FILE
        )
    except Exception:
        log.exception(
            "Unable to read jobs"
        )

    return render(
        request,
        "tracker/dashboard.html",
        {
            "jobs": jobs,
            "total": len(jobs),
        }
    )


def jobs_api(request):
    """
    Return ONLY the current search when
    keyword/location are supplied.
    """

    keyword = str(
        request.GET.get("keyword") or ""
    ).strip()

    location = str(
        request.GET.get("location") or ""
    ).strip()

    try:

        if keyword and location:
            jobs = read_search_jobs(
                settings.DATA_FILE,
                keyword,
                location
            )
        else:
            jobs = []

        return JsonResponse({
            "ok": True,
            "count": len(jobs),
            "jobs": jobs,
            "keyword": keyword,
            "location": location,
        })

    except Exception as exc:

        log.exception(
            "jobs API failed"
        )

        return JsonResponse(
            {
                "ok": False,
                "error": str(exc),
            },
            status=500
        )


def search_history_api(request):

    try:

        history = get_search_history(
            settings.DATA_FILE
        )

        return JsonResponse({
            "ok": True,
            "searches": history,
        })

    except Exception as exc:

        return JsonResponse(
            {
                "ok": False,
                "error": str(exc),
            },
            status=500
        )


def download_excel(request):

    try:

        if not settings.DATA_FILE.exists():
            return JsonResponse(
                {
                    "ok": False,
                    "error": "Excel file not found."
                },
                status=404
            )

        return FileResponse(
            open(
                settings.DATA_FILE,
                "rb"
            ),
            as_attachment=True,
            filename="naukri_jobs_master.xlsx"
        )

    except Exception as exc:

        return JsonResponse(
            {
                "ok": False,
                "error": str(exc),
            },
            status=500
        )


def download_search_excel(request):

    keyword = str(
        request.GET.get("keyword") or ""
    ).strip()

    location = str(
        request.GET.get("location") or ""
    ).strip()

    if not keyword:
        return JsonResponse(
            {
                "ok": False,
                "error": "Keyword is required."
            },
            status=400
        )

    if not location:
        return JsonResponse(
            {
                "ok": False,
                "error": "Location is required."
            },
            status=400
        )

    try:

        export_dir = (
            settings.BASE_DIR
            / "data"
            / "exports"
        )

        output = export_search_excel(
            settings.DATA_FILE,
            keyword,
            location,
            export_dir
        )

        return FileResponse(
            open(output, "rb"),
            as_attachment=True,
            filename=output.name
        )

    except Exception as exc:

        log.exception(
            "search export failed"
        )

        return JsonResponse(
            {
                "ok": False,
                "error": str(exc),
            },
            status=500
        )


@require_http_methods(["POST"])

@csrf_exempt
def run_scraper(request):

    if not settings.SCRAPER_ENABLED:
        msg = (
            "Live browser scraping cannot run inside Vercel Serverless Functions "
            "(Vercel has strict 10-15s timeouts and does not support headless Chromium). "
            "To scrape live jobs, run the scraper locally or deploy on a container host like Render / Railway."
            if getattr(settings, 'IS_VERCEL', False)
            else "Scraper disabled."
        )
        return JsonResponse(
            {
                "ok": False,
                "error": msg
            },
            status=503
        )

    try:

        payload = json.loads(
            request.body.decode() or "{}"
        )

        keyword = str(
            payload.get("keyword") or ""
        ).strip()

        location = str(
            payload.get("location") or ""
        ).strip()

        try:
            pages = max(
                1,
                min(
                    int(
                        payload.get("pages") or 1
                    ),
                    5
                )
            )
        except Exception:
            pages = 1

        if not keyword:

            return JsonResponse(
                {
                    "ok": False,
                    "error": "Keyword is required."
                },
                status=400
            )

        if not location:

            return JsonResponse(
                {
                    "ok": False,
                    "error": "Location is required."
                },
                status=400
            )

        script = (
            settings.BASE_DIR
            / "scraper"
            / "naukri_scraper.py"
        )

        runtime = settings.RUNTIME_DIR

        runtime.mkdir(
            parents=True,
            exist_ok=True
        )

        env = os.environ.copy()

        env["RUNTIME_DIR"] = str(
            runtime
        )

        cmd = [
            sys.executable,
            str(script),
            "--keyword",
            keyword,
            "--location",
            location,
            "--pages",
            str(pages),
            "--excel",
            str(settings.DATA_FILE),
        ]

        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=240,
            cwd=str(settings.BASE_DIR),
            env=env,
        )

        output = (
            proc.stdout
            or proc.stderr
            or ""
        ).strip()

        if proc.returncode != 0:

            return JsonResponse(
                {
                    "ok": False,
                    "error": output[-5000:]
                    or "Scraper failed."
                },
                status=500
            )

        result = {
            "scraped": 0,
            "verified": 0,
            "new_jobs": 0,
            "already_stored": 0,
            "location_rejected": 0,
        }

        for line in output.splitlines():

            if line.startswith(
                "SCRAPED_JOBS|"
            ):

                try:
                    result["scraped"] = int(
                        line.split("|")[1]
                    )
                except Exception:
                    pass

            elif line.startswith(
                "LOCATION_FILTER|"
            ):

                parts = line.split("|")

                for part in parts[1:]:

                    if "=" not in part:
                        continue

                    key, value = part.split(
                        "=",
                        1
                    )

                    if key == "verified":

                        try:
                            result[
                                "verified"
                            ] = int(value)
                        except Exception:
                            pass

                    elif key == "scraped":

                        try:
                            result[
                                "scraped"
                            ] = int(value)
                        except Exception:
                            pass

            elif line.startswith(
                "RESULT|"
            ):

                for part in line.split("|")[1:]:

                    if "=" not in part:
                        continue

                    key, value = part.split(
                        "=",
                        1
                    )

                    if key in result:

                        try:
                            result[key] = int(
                                value
                            )
                        except Exception:
                            pass

            elif line.startswith(
                "LOCATION_REJECTED|"
            ):

                result[
                    "location_rejected"
                ] += 1

        current_jobs = read_search_jobs(
            settings.DATA_FILE,
            keyword,
            location
        )

        result["current_search_count"] = (
            len(current_jobs)
        )

        result["total_stored"] = len(
            read_jobs(settings.DATA_FILE)
        )

        result["keyword"] = keyword
        result["location"] = location

        result["download_url"] = (
            "/download/search.xlsx"
            f"?keyword={keyword}"
            f"&location={location}"
        )

        result["ok"] = True

        result["message"] = output[-5000:]

        return JsonResponse(result)

    except subprocess.TimeoutExpired:

        return JsonResponse(
            {
                "ok": False,
                "error": (
                    "Scraper timed out. "
                    "Check the visible Playwright "
                    "browser."
                ),
            },
            status=504
        )

    except json.JSONDecodeError:

        return JsonResponse(
            {
                "ok": False,
                "error": "Invalid JSON request."
            },
            status=400
        )

    except Exception as exc:

        log.exception(
            "scraper API failed"
        )

        return JsonResponse(
            {
                "ok": False,
                "error": str(exc),
            },
            status=500
        )
