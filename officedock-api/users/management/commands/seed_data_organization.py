import random
from faker import Faker
from django.core.management.base import BaseCommand

from companies.models import Company
from users.models import Profile, Role, User
from users.constants import GenderTypes, RoleTypes
from organizations.models import Organization


class Command(BaseCommand):
    help = "Seed fake data into Organization"

    def add_arguments(self, parser):
        parser.add_argument(
            "total",
            type=int,
            help="Indicates the number of fake data to be generated",
        )

    def handle(self, *args, **kwargs):
        fake = Faker()
        total = kwargs["total"]
        password = "abcd@1234"
        companies = Company.objects.all()

        # Seed companies
        for _ in range(total):
            company = random.choice(companies)
            not_roles = [
                RoleTypes.OPERATION_ADMIN.value,
                RoleTypes.SYSTEM_ADMIN.value,
            ]

            # Seed users
            user = User.objects.create(
                company=company,
                email=fake.email(),
                password=password,
            )
            user.roles.set(
                Role.get_role(RoleTypes.random(not_values=not_roles)),
                through_defaults={"company": company},
            )

            # Seed profile
            Profile.objects.create(
                full_name=fake.name(),
                birthday=fake.passport_dob(),
                gender=GenderTypes.random(),
                user=user,
                company=company,
            )

            # Seed Organization
            superior = Organization.objects.filter(company=company).last()
            organization = Organization.objects.create(
                name=fake.currency_name(),
                company=company,
                superior=superior if superior else None,
            )
            organization.users.add(user, through_defaults={"company": company})

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into Organization"
            )
        )
