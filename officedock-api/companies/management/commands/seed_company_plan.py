from datetime import datetime
from django.core.management.base import BaseCommand
from django.db.models import Q

from common.services import stripe_service
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    Department,
    Industry,
    SystemMainPurpose,
)
from companies.models import Company, CompanyPlan
from companies.utils import generate_contract_related_date_base_on_now
from plans.models import Plan
from users.constants import RoleTypes


class Command(BaseCommand):
    help = "Seed company plan and contract"

    def handle(self, *args, **options):
        for company in Company.objects.all():
            total_user = company.users.count()
            related_date = generate_contract_related_date_base_on_now()
            # Seed data contract
            contract_data = {
                "department": [Department.random()],
                "industry": Industry.random(),
                "system_main_purpose": [SystemMainPurpose.random()],
                "start_date": related_date["start_date"],
                "end_date": related_date["end_date"],
                "next_renewal_at": related_date["next_renewal_at"],
            }
            if (
                admin_user := company.user_roles.filter(
                    role__name=RoleTypes.SYSTEM_ADMIN.value
                )
                .order_by("user__created_at")
                .first()
            ):
                if company.responsible_person_mail is None:
                    company.responsible_person_mail = (
                        admin_user.user.email
                        or admin_user.user.two_factor_auth_email
                    )
                    company.responsible_person_name = (
                        admin_user.user.profile.full_name
                    )
            if company.contract.next_renewal_at is None:
                company.contract.__dict__.update(contract_data)
                company.contract.save(update_fields=contract_data.keys())
            # # Seed data Company plan
            if not CompanyPlan.objects.filter(company=company).exists():
                if total_user <= 10:
                    filter = Q(limit_person=10)
                elif total_user <= 20:
                    filter = Q(limit_person=20)
                else:
                    filter = Q(limit_person=30)
                plan = Plan.objects.filter(filter).first()
                CompanyPlan.objects.create(plan=plan, company=company)
                # Seed data Company transaction
                company.transactions.create(
                    type=CompanyTransactionTypes.PLAN.value,
                    plan_start_at=datetime.now(),
                    plan=plan,
                )
            if company.max_user_at is None:
                company.max_user_at = datetime.now()
                company.max_user_in_contract_period = total_user
                company.status = (
                    CompanyStatus.TEMPORARY_USAGE.value
                    if total_user > 0
                    else CompanyStatus.PENDING_APPROVAL.value
                )
            company.save(
                update_fields=[
                    "max_user_at",
                    "max_user_in_contract_period",
                    "status",
                    "responsible_person_mail",
                    "responsible_person_name",
                ]
            )
            stripe_service.StripeService().get_or_create_customer(company)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seed data to Company Plan and Contract"
            )
        )
