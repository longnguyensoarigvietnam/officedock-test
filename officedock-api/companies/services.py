from django.contrib.auth.base_user import get_random_string
from rest_framework.fields import ValidationError
from base.messages import ERROR_MESSAGES
from common.services.stripe_service import StripeService
from common.utils import get_username_alias
from companies.constants import CompanyStatus
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
        # FIXME: Check duplicate email
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

    def change_plan(self, company: Company):
        """
        # TODO: comment here
        """
        stripe = StripeService()
        contract = company.contract

        # Update contract dates relative to the current time
        related_date = generate_contract_related_date_base_on_now()
        contract.__dict__.update(related_date)
        contract.save(update_fields=related_date.keys())
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
