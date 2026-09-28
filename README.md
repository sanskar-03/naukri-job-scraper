# Naukri Job Tracker

Django web application for searching Naukri listings with Playwright and appending only new jobs to an Excel workbook.

## Features
- Keyword, location and page controls
- Playwright Chromium scraping
- Job title, company, location, experience, skills, posted date and URL
- Duplicate prevention by Job ID and Job URL
- Existing Excel records are preserved
- Dashboard refreshes after every run
- Download `naukri_jobs.xlsx`
- Clear success/error status; HTTP 200 is not treated as a successful scrape unless the API reports the result

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
