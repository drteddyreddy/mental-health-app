from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Full project setup: seed questionnaires, create psychiatrist, configure Celery beat'

    def add_arguments(self, parser):
        parser.add_argument('--psychiatrist-username', default='psychiatrist')
        parser.add_argument('--psychiatrist-password', default='psych1234')

    def handle(self, *args, **options):
        self.stdout.write('=== MindWell Full Setup ===')

        self.stdout.write('\n[1/3] Seeding questionnaires...')
        call_command('seed_questionnaires')
        self.stdout.write(self.style.SUCCESS('  Done'))

        self.stdout.write('\n[2/3] Creating psychiatrist user...')
        try:
            call_command(
                'create_psychiatrist',
                options['psychiatrist_username'],
                'psychiatrist@mindwell.app',
                password=options['psychiatrist_password'],
            )
            self.stdout.write(self.style.SUCCESS('  Done'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  Skipped ({e})'))

        self.stdout.write('\n[3/3] Seeding Celery beat periodic tasks...')
        call_command('seed_periodic_tasks')
        self.stdout.write(self.style.SUCCESS('  Done'))

        self.stdout.write(self.style.SUCCESS('\nSetup complete!'))
        self.stdout.write(f'  Psychiatrist login: {options["psychiatrist_username"]}')
        self.stdout.write('  Register an HR account at /register')
