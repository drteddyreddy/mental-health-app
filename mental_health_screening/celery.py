import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mental_health_screening.settings')

app = Celery('mindwell')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
