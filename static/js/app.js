const form =
    document.getElementById("searchForm");

const button =
    document.getElementById("scrapeButton");

const statusBox =
    document.getElementById("searchStatus");

const currentPanel =
    document.getElementById("currentSearchPanel");

const currentTitle =
    document.getElementById("currentSearchTitle");

const currentDownload =
    document.getElementById("currentSearchDownload");

const currentJobsBody =
    document.getElementById("currentJobsBody");

const statFound =
    document.getElementById("statFound");

const statVerified =
    document.getElementById("statVerified");

const statRejected =
    document.getElementById("statRejected");

const statNew =
    document.getElementById("statNew");

const historyBox =
    document.getElementById("searchHistory");


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


function setStatus(
    message,
    type = "info"
) {

    statusBox.hidden = false;

    statusBox.textContent =
        message;

    statusBox.className =
        `status ${type}`;
}


function makeDownloadUrl(
    keyword,
    location
) {

    return (
        "/download/search.xlsx"
        + "?keyword="
        + encodeURIComponent(keyword)
        + "&location="
        + encodeURIComponent(location)
    );
}


async function fetchJson(url, options = {}) {

    const response =
        await fetch(url, options);

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    const text =
        await response.text();

    /*
     * This prevents the confusing:
     *
     * Unexpected token '<'
     *
     * message.
     */

    if (!contentType.includes("application/json")) {

        if (text.trim().startsWith("<")) {

            throw new Error(
                `Django returned an HTML page for ${url}. `
                + `Check the API URL/route. `
                + `HTTP ${response.status}.`
            );
        }

        throw new Error(
            `Expected JSON from ${url}, `
            + `but received ${contentType || "unknown response"}.`
        );
    }


    let data;

    try {

        data = JSON.parse(text);

    } catch {

        throw new Error(
            `Invalid JSON returned by ${url}.`
        );
    }


    if (!response.ok) {

        throw new Error(
            data.error
            || `Request failed (${response.status}).`
        );
    }


    return data;
}


function renderJobs(
    jobs,
    keyword,
    location
) {

    currentJobsBody.innerHTML = "";

    if (!jobs.length) {

        currentJobsBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No verified jobs found for
                    ${escapeHtml(location)}.
                </td>
            </tr>
        `;

        return;
    }


    const downloadUrl =
        makeDownloadUrl(
            keyword,
            location
        );


    for (const job of jobs) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(job.title)}
                </strong>
            </td>

            <td>
                ${escapeHtml(job.company)}
            </td>

            <td>
                <span class="location-badge">
                    ${escapeHtml(job.location)}
                </span>
            </td>

            <td>
                ${escapeHtml(job.experience)}
            </td>

            <td>
                ${escapeHtml(job.skills)}
            </td>

            <td>
                ${escapeHtml(job.posted_date)}
            </td>

            <td>

                <div class="actions">

                    <a
                        class="button small"
                        href="${escapeHtml(
                            job.job_url || "#"
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Open
                    </a>

                    <a
                        class="button small secondary"
                        href="${downloadUrl}"
                    >
                        Download
                    </a>

                </div>

            </td>
        `;


        currentJobsBody.appendChild(row);
    }
}


async function loadCurrentSearch(
    keyword,
    location
) {

    const url =
        "/api/jobs/"
        + "?keyword="
        + encodeURIComponent(keyword)
        + "&location="
        + encodeURIComponent(location);


    const data =
        await fetchJson(url);


    currentPanel.hidden = false;

    currentTitle.textContent =
        `${keyword} · ${location}`;

    currentDownload.href =
        makeDownloadUrl(
            keyword,
            location
        );


    statFound.textContent =
        data.count || 0;

    statVerified.textContent =
        data.count || 0;


    renderJobs(
        data.jobs || [],
        keyword,
        location
    );

    return data;
}


async function loadHistory() {

    try {

        const data =
            await fetchJson(
                "/api/search-history/"
            );


        const searches =
            data.searches || [];


        if (!searches.length) {

            historyBox.innerHTML =
                "<p>No previous searches yet.</p>";

            return;
        }


        historyBox.innerHTML = "";


        for (const item of searches) {

            const searchName =
                String(
                    item.search || ""
                );


            const parts =
                searchName.split(" - ");


            const keyword =
                parts.shift() || "";


            const location =
                parts.join(" - ") || "";


            const row =
                document.createElement("div");


            row.className =
                "history-row";


            row.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(searchName)}
                    </strong>

                    <span>
                        ${Number(item.count || 0)}
                        jobs
                    </span>

                </div>


                <div class="actions">

                    <button
                        type="button"
                        class="button small view-history"
                        data-keyword="${escapeHtml(keyword)}"
                        data-location="${escapeHtml(location)}"
                    >
                        View
                    </button>


                    <a
                        class="button small secondary"
                        href="${makeDownloadUrl(
                            keyword,
                            location
                        )}"
                    >
                        Download
                    </a>

                </div>
            `;


            historyBox.appendChild(row);
        }


        document
            .querySelectorAll(".view-history")
            .forEach(item => {

                item.addEventListener(
                    "click",
                    async () => {

                        try {

                            await loadCurrentSearch(
                                item.dataset.keyword,
                                item.dataset.location
                            );

                            currentPanel.scrollIntoView({
                                behavior: "smooth"
                            });

                        } catch (error) {

                            setStatus(
                                error.message,
                                "error"
                            );
                        }
                    }
                );
            });


    } catch (error) {

        historyBox.innerHTML = `
            <div class="status error">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}


form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const keyword =
            document
                .getElementById("keyword")
                .value
                .trim();


        const location =
            document
                .getElementById("location")
                .value
                .trim();


        const pages =
            document
                .getElementById("pages")
                .value;


        if (!keyword || !location) {

            setStatus(
                "Keyword and location are required.",
                "error"
            );

            return;
        }


        button.disabled = true;

        button.textContent =
            "Scraping...";


        setStatus(
            `Searching Naukri for `
            + `${keyword} in ${location}...`,
            "info"
        );


        try {

            const data =
                await fetchJson(
                    "/api/run-scraper/",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            keyword,
                            location,
                            pages
                        })
                    }
                );


            statFound.textContent =
                data.scraped || 0;

            statVerified.textContent =
                data.verified || 0;

            statRejected.textContent =
                data.location_rejected || 0;

            statNew.textContent =
                data.new_jobs || 0;


            setStatus(
                `Search completed — `
                + `${data.verified || data.current_search_count || 0} `
                + `verified, `
                + `${data.new_jobs || 0} new, `
                + `${data.already_stored || 0} already stored, `
                + `${data.location_rejected || 0} rejected `
                + `because of location mismatch.`,
                "success"
            );


            await loadCurrentSearch(
                keyword,
                location
            );


            await loadHistory();


        } catch (error) {

            setStatus(
                error.message,
                "error"
            );

        } finally {

            button.disabled = false;

            button.textContent =
                "Start Scrape";
        }
    }
);


loadHistory();
