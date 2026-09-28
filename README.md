# Naukri Job Tracker

Django web application for searching Naukri listings with Playwright and appending only new jobs to an Excel workbook.

## Live Demo
- **Vercel Hosted Web App**: [https://naukri-job-scraper-sanskarkumar838383-6169.vercel.app](https://naukri-job-scraper-sanskarkumar838383-6169.vercel.app)

## Features
- Keyword, location and page controls
- Playwright Chromium scraping with headless/headed options
- Captures: Job title, company, location, experience, skills, posted date and URL
- Duplicate prevention by Job ID and Job URL
- Existing Excel records are preserved (Master History + Per-search sheets)
- Web Dashboard with real-time counters (Found, Verified, Rejected, New)
- Download Master Excel (`naukri_jobs.xlsx`) or search-filtered Excel directly
- Error handling and logging (`naukri_scraper.log`)

## Local setup (Windows)
```bat
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium
python manage.py check
python manage.py migrate
python manage.py runserver
```
Open http://127.0.0.1:8000/

## Direct scraper test
```bat
python scraper\naukri_scraper.py --keyword "Python Developer" --location "Chennai" --pages 1
```

Respect Naukri's access rules and do not attempt to bypass CAPTCHA, authentication, robots controls, rate limits or other anti-bot protections. Naukri can change its HTML, so selectors may need maintenance over time.
