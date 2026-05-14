from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from screening.models import UserProfile


class Command(BaseCommand):
    help = "Create a psychiatrist user account"

    def add_arguments(self, parser):
        parser.add_argument("username", type=str)
        parser.add_argument("email", type=str)
        parser.add_argument("--password", type=str, default=None)

    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"] or User.objects.make_random_password(length=16)

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'User "{username}" already exists'))
            return

        user = User.objects.create_user(
            username=username, email=email, password=password, is_staff=True
        )
        UserProfile.objects.create(user=user, role="psychiatrist")
        self.stdout.write(self.style.SUCCESS(f'Psychiatrist "{username}" created'))
        self.stdout.write(f"Password: {password}")
