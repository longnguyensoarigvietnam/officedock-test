from django.core.management.base import BaseCommand

from users.constants import RoleTypes
from users.models import Role


class Command(BaseCommand):
    help = "Seed fake data into Role"

    def handle(self, *args, **kwargs):
        # Seed roles
        for role in RoleTypes:
            if Role.objects.filter(name=role.name).exists():
                Role.objects.filter(name=role.name).update(name=role.value)

            if not Role.objects.filter(name=role.value).exists():
                Role.objects.create(name=role.value)

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded fake data into Role")
        )
