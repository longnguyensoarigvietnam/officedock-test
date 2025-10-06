import datetime
from django.contrib.auth.base_user import get_random_string
from datetime import timezone
from django.db import transaction
from django.db.models import Q
from django.utils.timezone import now
from rest_framework.fields import ValidationError
import stripe
from base.messages import ERROR_MESSAGES
from common.services.stripe_service import StripeService
from common.utils import (
    format_date,
    get_client_ip,
    get_user_agent,
    get_username_alias,
    to_datetime,
)
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    TransactionStatus,
)
from companies.models import Company, CompanyTransaction
from companies.utils import generate_contract_related_date_base_on_now
from plans.models import Plan
from users.constants import LoginTypes, RoleTypes
from users.models import Profile, Role, User, UserActivityLog
from utils.mail import PaymentMailService


class CompanyService:
    def __init__(self):
        """
        Initialize the Stripe service by setting the Stripe secret API key.
        """
        self.stripe_service = StripeService()

    def active_company(self, request, company: Company):
        """
        Activate a company by creating its admin user, assigning roles,
        setting up Stripe subscription, and updating contract status.
        """
        current_user = request.user
        if company.status != CompanyStatus.PENDING_APPROVAL.value:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["company_not_match"]}
            )
        contract = company.contract
        user_data = {}
        # Prepare profile and login data for the system admin user
        profile = {"full_name": company.responsible_person_name}
        user_data["two_factor_auth_email"] = company.responsible_person_mail
        user_data["email"] = company.responsible_person_mail
        user_data["password"] = get_random_string(8)
        user_data["login_type"] = LoginTypes.EMAIL.value
        user_data["username_alias"] = get_username_alias(
            login_text=company.responsible_person_mail,
        )
        user_data["is_two_factor_auth"] = False
        user = User.objects.create(company=company, **user_data)
        Profile.objects.create(user=user, company=company, **profile)

        # Add system admin to user
        role = Role.get_role(RoleTypes.SYSTEM_ADMIN.value)
        user.roles.add(role, through_defaults={"company": company})

        # Save calendar organization
        calendar_org = company.get_calendar_organization()
        user.organizations.add(
            calendar_org,
            through_defaults={
                "company": company,
                "is_main": False,
            },
        )

        # Log user create
        UserActivityLog.log_user_creation(
            user,
            current_user,
            get_client_ip(request),
            get_user_agent(request),
        )

        # Update contract dates relative to the current time
        related_date = generate_contract_related_date_base_on_now()
        contract.__dict__.update(related_date)
        contract.save(update_fields=related_date.keys())
        company.transactions.create(
            plan_start_at=now(),
            plan=company.company_plan.plan,
            type=CompanyTransactionTypes.PLAN.value,
        )

        # Create Stripe postpaid subscription and save IDs to company plan
        subscription = (
            self.stripe_service.create_postpaid_subscription_with_invoice(
                company
            )
        )
        company.company_plan.stripe_subscription_id = subscription.id
        company.company_plan.save(
            update_fields=[
                "stripe_subscription_id",
            ]
        )
        # Mark company as active and save status
        company.status = CompanyStatus.ACTIVE_CONTRACT.value
        company.max_user_in_contract_period = 1
        company.max_user_at = datetime.datetime.now()
        company.save(
            update_fields=[
                "status",
                "max_user_in_contract_period",
                "max_user_at",
            ]
        )
        # Send welcome email with login credentials to the admin
        mail_service = PaymentMailService()
        mail_service.send_account_issued(
            recipient=company.responsible_person_mail,
            user_email=company.responsible_person_mail,
            password=user_data["password"],
            company_name=company.name,
            responsible_name=company.responsible_person_name,
        )

    def handle_contract_renewal(self, company, day):
        """
        Handle automatic contract renewal for the given company.
        """
        contract = company.contract

        if (
            company.contract.cancel_at
            and company.contract.cancel_at.date() <= day
        ):
            self.change_status_of_company(
                company, CompanyStatus.CANCELLATION_PENDING.value
            )
            print(f"✅ Company : {company.id} pending contract at: {day}")
            return True
        # Handle check max user
        company_user_count = company.users.count()
        current_plan = company.company_plan.plan
        filter = Q()
        if company_user_count <= 10:
            filter = Q(limit_person=10)
        elif company_user_count <= 20:
            filter = Q(limit_person=20)
        else:
            filter = Q(limit_person=30)
        plan = Plan.objects.filter(filter).first()
        if plan != current_plan:
            self.stripe_service.change_price_of_subscription(company, plan)
        related_date = generate_contract_related_date_base_on_now(
            contract.next_renewal_at
        )
        contract.end_date = related_date["end_date"]
        contract.next_renewal_at = related_date["next_renewal_at"]
        contract.save(update_fields=["end_date", "next_renewal_at"])
        print(
            f"✅ Company : {company.id} renewal contract at: {contract.next_renewal_at}"
        )

        return True

    def change_status_of_company(self, company, status):
        """
        Change status of company when over end date of contract
        """
        company.status = status
        company.save(update_fields=["status"])

    def change_plan(self, company):
        """
        Change the company's subscription plan in Stripe and update the local CompanyPlan.

        Raises:
            Exception: If Stripe subscription creation fails.
        """

        if (
            self.stripe_service.retrieve_subscription(
                company.company_plan.stripe_subscription_id
            )
            is None
        ):
            # Create Stripe postpaid subscription and save IDs to company plan
            subscription = (
                self.stripe_service.create_postpaid_subscription_with_invoice(
                    company
                )
            )
        company.company_plan.stripe_subscription_id = subscription.id
        company.company_plan.save(
            update_fields=[
                "stripe_subscription_id",
            ]
        )

    def cancellation_pending_contract(self, company):
        """
        Mark the company's contract as pending cancellation and schedule Stripe cancellation.
        """
        if not company.company_plan.stripe_subscription_id:
            raise ValidationError({"detail": ERROR_MESSAGES["plan_invalid"]})

        contract = company.contract
        contract.cancel_at = now()
        contract.save(update_fields=["cancel_at"])
        PaymentMailService().send_contract_cancellation_request(
            recipient=company.responsible_person_mail,
            company_name=company.name,
            responsible_name=company.responsible_person_name,
            end_date=format_date(date=contract.end_date, style="jp_date"),
        )
        company.status = CompanyStatus.CANCELLATION_PENDING.value
        company.save(update_fields=["status"])
        subscription_cancel_at = datetime.datetime.combine(
            contract.end_date, datetime.time.max, tzinfo=timezone.utc
        )
        self.stripe_service.handle_cancel_subscription(
            subscription_id=company.company_plan.stripe_subscription_id,
            cancel_at=subscription_cancel_at,
        )

    def handle_invoice_base_on_status(self, company):
        """
        Handle all unpaid invoices for a company by checking their status in Stripe
        and finalizing them if necessary.
        """
        invoices = CompanyTransaction.objects.filter(
            company=company,
            paid_at__isnull=True,
            type=CompanyTransactionTypes.INVOICE.value,
            status=TransactionStatus.UNPAID.value,
        ).all()
        if invoices:
            for invoice in invoices:
                stripe_invoice = self.stripe_service.get_invoice(
                    invoice.stripe_invoice_id
                )
                if stripe_invoice:
                    self.stripe_service.update_invoice_finalize(
                        stripe_invoice, company
                    )

    def upgrade_plan(self, company, plan):
        """
        Upgrade the company's plan both locally and in Stripe.

        Steps:
        1. Validate that the new plan differs from the current one.
        2. Update the company's local plan and transaction history.
        3. Update the Stripe subscription to the new plan price.
        4. Replace or regenerate the related invoice to reflect the new plan
        """
        try:
            old_plan = company.company_plan.plan.name
            self.stripe_service.change_price_of_subscription(company, plan)
            invoice = self.stripe_service.replace_invoice_subscription(
                company, plan
            )
            start_month = to_datetime(invoice.created)
            with transaction.atomic():
                # Update new plan
                company.company_plan.plan = plan
                company.company_plan.save(update_fields=["plan"])
                # Update history use plan
                company.transactions.filter(
                    type=CompanyTransactionTypes.PLAN.value,
                    plan_end_at__isnull=True,
                ).update(plan_end_at=start_month)
                company.transactions.create(
                    type=CompanyTransactionTypes.PLAN.value,
                    plan_start_at=start_month,
                    plan=plan,
                )
            PaymentMailService().send_plan_auto_upgrade(
                recipient=company.responsible_person_mail,
                company_name=company.name,
                responsible_name=company.responsible_person_name,
                old_plan=old_plan,
                new_plan=plan.name,
                start_month=format_date(start_month, style="jp_month_year"),
                new_price=format(invoice.amount_due, ","),
            )
            return True
        except stripe.error.StripeError as e:
            raise ValidationError({"detail": e.user_message or str(e)})

        except Exception as e:
            raise ValidationError({"detail": str(e)})
