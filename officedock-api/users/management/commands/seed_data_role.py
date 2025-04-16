from django.core.management.base import BaseCommand

from users.constants import RoleTypes
from users.models import Role


class Command(BaseCommand):
    help = "Seed fake data into Role"

    def handle(self, *args, **kwargs):
        # Seed roles
        for role in RoleTypes:
            system_role = None
            if role.value != RoleTypes.OPERATION_ADMIN.value:
                system_role = True

            if not Role.objects.filter(name=role.value).exists():
                Role.objects.create(name=role.value, system_role=system_role)

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded fake data into Role")
        )
