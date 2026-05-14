from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask


class Command(BaseCommand):
    help = 'Create Celery beat periodic tasks for reminders and auto-close'

    def handle(self, *args, **options):
        daily, _ = CrontabSchedule.objects.get_or_create(
            minute='0', hour='8', day_of_week='*',
            day_of_month='*', month_of_year='*',
        )

        PeriodicTask.objects.update_or_create(
            name='Send reminders for all active campaigns',
            defaults={
                'crontab': daily,
                'task': 'screening.tasks.send_reminders_for_all_active_campaigns',
                'enabled': True,
            },
        )

        PeriodicTask.objects.update_or_create(
            name='Auto-close expired campaigns',
            defaults={
                'crontab': daily,
                'task': 'screening.tasks.auto_close_expired_campaigns',
                'enabled': True,
            },
        )

        self.stdout.write(self.style.SUCCESS('Periodic tasks created: reminders + auto-close'))
