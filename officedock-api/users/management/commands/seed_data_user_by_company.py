from faker import Faker
from django.core.management.base import BaseCommand

from common.utils import get_username_alias
from companies.models import Company
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
        parser.add_argument(
            "company_id",
            type=int,
            help="Indicates the company of fake data to be generated",
        )

    def handle(self, *args, **kwargs):
        fake = Faker()
        total = kwargs["total"]
        company_id = kwargs["company_id"]
        password = "abcd@1234"
        company = Company.objects.filter(id=company_id).first()
        if not company:
            self.stdout.write(self.style.ERROR(f"Wrong company"))
            return
        role = Role.get_role(RoleTypes.GENERAL.value)
        amount = 1
        while amount <= total:
            email = fake.email()
            if User.objects.filter(email=email).exists():
                continue
            username_alias = get_username_alias(login_text=email)
            # Seed users
            user = User.objects.create(
                company=company,
                email=fake.email(),
                password=password,
                username_alias=username_alias,
            )
            user.roles.add(role, through_defaults={"company": company})

            # Seed profile
            Profile.objects.create(
                full_name=fake.name(),
                birthday=fake.passport_dob(),
                gender=GenderTypes.random(),
                user=user,
                company=company,
            )
            amount += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into User for company {company.name}"
            )
        )
