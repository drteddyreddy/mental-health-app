FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=mental_health_screening.settings

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir gunicorn

COPY . .

RUN python manage.py collectstatic --noinput --clear

EXPOSE 8000

CMD ["gunicorn", "mental_health_screening.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
