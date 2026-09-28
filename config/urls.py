from django.urls import path
from tracker.views import download_search_excel,  dashboard, jobs_api, run_scraper, download_excel, search_history_api

urlpatterns = [
    path(
        "api/search-history/",
        search_history_api,
        name="search_history_api",
    ),
    
    path('', dashboard, name='dashboard'),
    path('api/jobs/', jobs_api, name='jobs_api'),
    path('api/run-scraper/', run_scraper, name='run_scraper'),
    path('download/jobs.xlsx', download_excel, name='download_excel'),

    path(
        "download/search.xlsx",
        download_search_excel,
        name="download_search_excel",
    ),
]
