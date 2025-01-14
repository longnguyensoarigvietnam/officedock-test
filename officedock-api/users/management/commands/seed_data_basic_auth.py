import os
from django.core.management.base import BaseCommand
from faker import Faker

from companies.models import Company
from users.models import Role, User
from users.constants import RoleTypes


class Command(BaseCommand):
    help = "Seed fake data into Admin for Basic Authentication"

    def handle(self, *args, **kwargs):
        fake = Faker()
        email = os.getenv("BASIC_AUTH_EMAIL")
        password = os.getenv("BASIC_AUTH_PASSWORD")

        # Seed Admin for Basic Authentication
        if not User.objects.filter(email=email).exists():
            # Company data is only used to create admin
            # This does create company data in the database
            # But it will not be used in querying company data
            company_data = {
                "name": fake.company(),
            }
            company, _ = Company.all_objects.get_or_create(
                pk=0, defaults=company_data
            )

            user = User.objects.create(
                company=company,
                email=email,
                password=password,
            )
            user.roles.set(
                Role.get_role(RoleTypes.OPERATION_ADMIN.value),
                through_defaults={"company": company},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded fake data into Admin for Basic Authentication"
            )
        )
