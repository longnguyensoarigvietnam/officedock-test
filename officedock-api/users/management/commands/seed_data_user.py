from faker import Faker
from django.core.management.base import BaseCommand

from companies.models import Company, Contract
from users.models import Profile, Role, User
from users.constants import GenderTypes, RoleTypes


class Command(BaseCommand):
    help = "Seed fake data into User"

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

        # Seed companies
        for _ in range(total):
            company = Company.objects.create(name=fake.company())
            Contract.objects.create(company=company)

            # Seed users
            user = User.objects.create(
                company=company,
                email=fake.email(),
                password=password,
            )
            user.roles.set(
                Role.get_role(RoleTypes.SYSTEM_ADMIN.value),
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

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into User"
            )
        )
