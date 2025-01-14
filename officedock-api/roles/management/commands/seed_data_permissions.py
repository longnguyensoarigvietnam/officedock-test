from django.core.management.base import BaseCommand
from roles.utils import create_role_permissions_default


class Command(BaseCommand):
    help = "Seed data into Permission."

    def handle(self, *args, **kwargs):
        # Run seed role permission
        create_role_permissions_default()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded role permissions into the database."
            )
        )
