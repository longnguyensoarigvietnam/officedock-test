from django.conf import settings
from django.core.management.base import BaseCommand

from companies.models import Company
from users.models import Role, User, Profile
from users.constants import RoleTypes
from common.utils import get_username_alias


class Command(BaseCommand):
    help = "Seed fake data into Admin"

    def handle(self, *args, **kwargs):
        email = settings.ADMIN_EMAIL
        password = settings.ADMIN_PASSWORD

        # Seed Admin
        if not User.objects.filter(email=email).exists():
            # Company data is only used to create admin
            # This does create company data in the database
            # But it will not be used in querying company data
            company_data = {
                "name": "運用者の会社",
            }
            company, _ = Company.all_objects.update_or_create(
                pk=0, defaults=company_data
            )
            username_alias = get_username_alias(
                login_text=email, is_operation_admin=True
            )
            user = User.objects.create(
                company=company,
                email=email,
                password=password,
                username_alias=username_alias,
            )
            # Seed admin profile
            Profile.objects.create(
                full_name="運用者",
                user=user,
                company=company,
            )
            user.roles.set(
                [Role.get_role(RoleTypes.OPERATION_ADMIN.value)],
                through_defaults={"company": company},
            )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded fake data into Admin")
        )
