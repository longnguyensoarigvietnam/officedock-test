import datetime
from django.contrib.auth.base_user import get_random_string
from rest_framework.fields import ValidationError
from base.messages import ERROR_MESSAGES
from common.services import stripe_service
from common.services.stripe_service import StripeService
from common.utils import get_username_alias
from companies.constants import CompanyStatus, CompanyTransactionTypes
from companies.models import Company
from companies.utils import generate_contract_related_date_base_on_now
from users.constants import LoginTypes, RoleTypes
from users.models import Profile, Role, User
from utils.mail import MailService


class CompanyService:
    def active_company(self, company: Company):
        """
        Activate a company by creating its admin user, assigning roles,
        setting up Stripe subscription, and updating contract status.
        """
        if company.status != CompanyStatus.PENDING_APPROVAL.value:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["company_not_match"]}
            )
        stripe = StripeService()
        contract = company.contract
        user_data = {}
        # Prepare profile and login data for the system admin user
        profile = {"full_name": contract.responsible_person_name}
        user_data["two_factor_auth_email"] = contract.responsible_person_mail
        user_data["password"] = get_random_string(8)
        user_data["login_type"] = LoginTypes.EMAIL.value
        user_data["username_alias"] = get_username_alias(
            login_text=contract.responsible_person_mail,
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

        # Send welcome email with login credentials to the admin
        mail_service = MailService()
        mail_service.send_admin_create_company_by_email(
            user.email, user_data["password"], company
        )

        # Update contract dates relative to the current time
        related_date = generate_contract_related_date_base_on_now()
        contract.__dict__.update(related_date)
        contract.save(update_fields=related_date.keys())
        company.transactions.create(
            plan_start_at=related_date["start_date"],
            plan=company.plan.plan,
            type=CompanyTransactionTypes.PLAN.value,
        )
        # Create Stripe postpaid subscription and save IDs to company plan
        subscription = stripe.create_postpaid_subscription_with_invoice(
            company, start_date=related_date["start_date"]
        )
        company.plan.stripe_subscription_id = subscription.id
        items = subscription.get("items", {}).get("data", [])
        if items:
            company.plan.stripe_subscription_item_id = items[0]["id"]
        company.plan.save(
            update_fields=[
                "stripe_subscription_id",
                "stripe_subscription_item_id",
            ]
        )

        # Mark company as active and save status
        company.status = CompanyStatus.ACTIVE_CONTRACT.value
        company.save(update_fields=["status"])

    def handle_contract_renewal(self, company, invoice):
        """
        Handle automatic contract renewal for the given company.
        """
        invoice_start_date = datetime.datetime.fromtimestamp(invoice.created)
        if (
            company.contract.cancel_at
            and company.contract.cancel_at < invoice_start_date
        ):
            end_date = company.contract.end_date
            cancel_at = datetime.datetime.combine(end_date, datetime.time.max)
            self.change_status_of_company(
                company, CompanyStatus.CANCELLATION_PENDING.value
            )
            stripe_service.StripeService().handle_cancel_subscription(
                subscription_id=invoice.subscription, cancel_at=cancel_at
            )
            print(
                f"✅ Company : {company.id} pending contract at: {contract.cancel_at}"
            )
            return True
        contract = company.contract
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
        stripe = StripeService()
        related_date = generate_contract_related_date_base_on_now()

        # Create Stripe postpaid subscription and save IDs to company plan
        subscription = stripe.create_postpaid_subscription_with_invoice(
            company, start_date=related_date["start_date"]
        )
        company.plan.stripe_subscription_id = subscription.id
        items = subscription.get("items", {}).get("data", [])
        if items:
            company.plan.stripe_subscription_item_id = items[0]["id"]
        company.plan.save(
            update_fields=[
                "stripe_subscription_id",
                "stripe_subscription_item_id",
            ]
        )
