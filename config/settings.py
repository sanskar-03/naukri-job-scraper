import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-only-change-me')
DEBUG = os.getenv('DEBUG', '1') == '1'
ALLOWED_HOSTS = [x.strip() for x in os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',') if x.strip()]
if '*' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS += ['testserver']

ROOT_URLCONF = 'config.urls'
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
]
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
]
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': ['django.template.context_processors.request']},
}]
WSGI_APPLICATION = 'config.wsgi.application'

IS_VERCEL = 'VERCEL' in os.environ or os.getenv('IS_VERCEL') == '1'

if IS_VERCEL:
    ALLOWED_HOSTS += ['.vercel.app', 'now.sh']
    CSRF_TRUSTED_ORIGINS = [x.strip() for x in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if x.strip()]
    CSRF_TRUSTED_ORIGINS += ['https://*.vercel.app']
    
    RUNTIME_DIR = Path('/tmp/runtime')
    DATA_FILE = Path('/tmp/data/naukri_jobs.xlsx')
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    initial_data = BASE_DIR / 'data' / 'naukri_jobs.xlsx'
    if initial_data.exists() and not DATA_FILE.exists():
        import shutil
        shutil.copy2(initial_data, DATA_FILE)
        
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': '/tmp/tracker.sqlite3'
        }
    }
    SCRAPER_ENABLED = os.getenv('SCRAPER_ENABLED', '0') == '1'
else:
    RUNTIME_DIR = Path(os.getenv('RUNTIME_DIR', str(BASE_DIR / 'runtime')))
    DATA_FILE = BASE_DIR / 'data' / 'naukri_jobs.xlsx'
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'data' / 'tracker.sqlite3'}}
    SCRAPER_ENABLED = os.getenv('SCRAPER_ENABLED', '1') == '1'
    CSRF_TRUSTED_ORIGINS = [x.strip() for x in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if x.strip()]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

