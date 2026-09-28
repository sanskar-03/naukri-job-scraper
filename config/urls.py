from django.urls import path
from tracker.views import (
    dashboard,
    jobs_api,
    run_scraper,
    download_excel,
    download_search_excel,
    search_history_api,
    delete_search_api,
    delete_all_searches_api,
)

urlpatterns = [
    path('', dashboard, name='dashboard'),
    path('api/jobs/', jobs_api, name='jobs_api'),
    path('api/run-scraper/', run_scraper, name='run_scraper'),
    path('api/search-history/', search_history_api, name='search_history_api'),
    path('api/delete-search/', delete_search_api, name='delete_search_api'),
    path('api/clear-history/', delete_all_searches_api, name='delete_all_searches_api'),
    path('download/jobs.xlsx', download_excel, name='download_excel'),
    path('download/search.xlsx', download_search_excel, name='download_search_excel'),
]

