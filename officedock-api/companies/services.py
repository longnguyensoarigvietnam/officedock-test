import datetime
from django.contrib.auth.base_user import get_random_string
from datetime import timezone
from django.db.models import Q
from django.utils.timezone import now
from rest_framework.fields import ValidationError
import stripe
from base.messages import ERROR_MESSAGES
from chat.constants import WebSocketEventType
from common.constants import InvoiceStatus
from common.services.stripe_service import StripeService
from common.utils import (
    format_date,
    get_a_day_in_next_month,
    get_client_ip,
    get_user_agent,
    get_username_alias,
    send_web_socket_event,
    to_datetime,
)
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    PaymentTypes,
    TransactionStatus,
)
from companies.models import Company, CompanyTransaction
from companies.utils import generate_contract_related_date_base_on_now
from plans.constants import (
    CUSTOM_PLAN,
    LIMIT_PERSON_PLAN_11_20,
    LIMIT_PERSON_PLAN_1_10,
    LIMIT_PERSON_PLAN_21_30,
)
from plans.models import Plan, Tax
from roles.constants import Screens, SelectionResultOptions
from users.constants import LoginTypes, RoleTypes
from users.models import Profile, Role, User, UserActivityLog
from users.serializers import UserPermissionsSerializer
from utils.mail import PaymentMailService


class CompanyService:
    def __init__(self):
        """
        Initialize the Stripe service by setting the Stripe secret API key.
        """
        self.stripe_service = StripeService()
        self.mail_service = PaymentMailService()

    def update_new_plan(
        self,
        company,
        plan,
        monthly_fee=None,
        stripe_price_id=None,
        exchangeable_amount=None,
        limit_person=None,
    ):
        """
        Update a company plan by plan, and validated data
        """
        if plan.name != CUSTOM_PLAN:
            monthly_fee = plan.monthly_fee
            stripe_price_id = plan.stripe_price_id
            exchangeable_amount = plan.exchangeable_amount
            limit_person = plan.limit_person

        company.company_plan.plan = plan
        company.company_plan.monthly_fee = monthly_fee
        company.company_plan.stripe_price_id = stripe_price_id
        company.company_plan.exchangeable_amount = exchangeable_amount
        company.company_plan.limit_person = limit_person
        company.company_plan.save(
            update_fields=[
                "monthly_fee",
                "stripe_price_id",
                "exchangeable_amount",
                "limit_person",
                "plan",
            ]
        )

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
        if company.payment_type == PaymentTypes.CREDIT_CARD.value:
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
        self.mail_service.send_account_issued(
            recipient=company.responsible_person_mail,
            user_email=company.responsible_person_mail,
            password=user_data["password"],
            company_name=company.name,
            responsible_name=company.responsible_person_name,
        )

    def handle_contract_renewal(self, company):
        """
        Handle automatic contract renewal for the given company.
        """
        contract = company.contract
        related_date = generate_contract_related_date_base_on_now(
            contract.next_renewal_at
        )
        contract.end_date = related_date["end_date"]
        contract.next_renewal_at = related_date["next_renewal_at"]
        contract.save(update_fields=["end_date", "next_renewal_at"])

        return True

    def change_status_of_company(self, company, status):
        """
        Change status of company when over end date of contract
        """
        company.status = status
        company.save(update_fields=["status"])

    def custom_plan(self, company, validated_data):
        """
        Change the company's subscription plan in Stripe and create the local custom plan.

        Raises:
            Exception: If Stripe subscription creation fails.
        """
        plan, created = Plan.objects.get_or_create(
            name=CUSTOM_PLAN,
            defaults={"is_custom_plan": True},
        )
        if company.payment_type == PaymentTypes.CREDIT_CARD.value:
            stripe_product_id = plan.stripe_product_id if not created else None
            stripe_price = None
            if created:
                (
                    product,
                    stripe_price,
                ) = self.stripe_service.create_product_with_price(
                    name=plan.name,
                    amount=validated_data["monthly_fee"],
                    currency="jpy",
                    interval="month",
                )
                plan.stripe_product_id = product.id
                plan.save(update_fields=["stripe_product_id"])
            else:
                prices = stripe.Price.list(product=stripe_product_id)
                for p in prices.data:
                    if p.unit_amount == int(validated_data["monthly_fee"]):
                        stripe_price = p
                        break
                if not stripe_price:
                    stripe_price = self.stripe_service.create_price_by_product(
                        product=stripe_product_id,
                        amount=validated_data["monthly_fee"],
                        currency="jpy",
                        interval="month",
                    )
        self.update_new_plan(
            company,
            plan,
            validated_data["monthly_fee"],
            (
                stripe_price.id
                if company.payment_type == PaymentTypes.CREDIT_CARD.value
                else None
            ),
            exchangeable_amount=validated_data["exchangeable_amount"],
            limit_person=validated_data["limit_person"],
        )
        if company.status != CompanyStatus.PENDING_APPROVAL.value:
            self.upgrade_plan(company, plan, is_custom_plan=True)

    def cancellation_pending_contract(self, company):
        """
        Mark the company's contract as pending cancellation and schedule Stripe cancellation.
        """
        is_credit_card_method = (
            company.payment_type == PaymentTypes.CREDIT_CARD.value
        )
        if (
            is_credit_card_method
            and not company.company_plan.stripe_subscription_id
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["plan_invalid"]})

        contract = company.contract
        contract.cancel_at = now()
        contract.save(update_fields=["cancel_at"])
        self.mail_service.send_contract_cancellation_request(
            recipient=company.responsible_person_mail,
            company_name=company.name,
            responsible_name=company.responsible_person_name,
            end_date=format_date(date=contract.end_date, style="jp_date"),
        )
        company.status = CompanyStatus.CANCELLATION_PENDING.value
        company.save(update_fields=["status"])
        if is_credit_card_method:
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
                if (
                    stripe_invoice
                    and stripe_invoice.status == InvoiceStatus.DRAFT.value
                ):
                    self.stripe_service.update_invoice_finalize(
                        stripe_invoice, company
                    )
                else:
                    status = ""
                    if stripe_invoice == InvoiceStatus.PAID.value:
                        status = TransactionStatus.PAID.value
                    elif stripe_invoice == InvoiceStatus.VOID.value:
                        status = TransactionStatus.SKIP_PAYMENT.value
                    if status:
                        invoice.status = status
                        invoice.save(update_fields=["status"])

    def handle_pay_invoice_failed_retry(self, company, stripe_pm_id=None):
        """
        Handle all payment failed invoices for a company by checking their status in Stripe
        and pay them.
        """
        invoices = CompanyTransaction.objects.filter(
            company=company,
            type=CompanyTransactionTypes.INVOICE.value,
            status=TransactionStatus.PAYMENT_FAILED.value,
        ).all()
        if invoices:
            for invoice in invoices:
                stripe_invoice = self.stripe_service.get_invoice(
                    invoice.stripe_invoice_id
                )
                if stripe_invoice and stripe_pm_id:
                    self.stripe_service.handle_pay_invoice(
                        stripe_invoice, stripe_pm_id
                    )

    def upgrade_plan(self, company, plan, is_custom_plan=False):
        """
        Upgrade the company's plan both locally and in Stripe.

        Steps:
        1. Validate that the new plan differs from the current one.
        2. Update the company's local plan and transaction history.
        3. Update the Stripe subscription to the new plan price.
        4. Replace or regenerate the related invoice to reflect the new plan
        """
        try:
            last_upgrade = company.transactions.filter(
                type=CompanyTransactionTypes.PLAN.value,
            ).last()
            company_plan = company.company_plan
            invoice = None
            if not is_custom_plan:
                self.update_new_plan(company, plan)
            if company.payment_type == PaymentTypes.CREDIT_CARD.value:
                self.stripe_service.change_price_of_subscription(company)
                invoice = self.stripe_service.replace_invoice_subscription(
                    company
                )
            start_month = to_datetime(invoice.created) if invoice else now()
            tax = Tax.objects.first()
            new_price = company_plan.monthly_fee * (1 + tax.percentage / 100)
            if last_upgrade.plan.name != CUSTOM_PLAN:
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
                self.mail_service.send_plan_auto_upgrade(
                    recipient=company.responsible_person_mail,
                    company_name=company.name,
                    responsible_name=company.responsible_person_name,
                    old_plan=last_upgrade.plan.name,
                    new_plan=plan.name,
                    start_month=format_date(start_month, style="jp_month_year"),
                    new_price=format(
                        invoice.amount_due if invoice else int(new_price), ","
                    ),
                    is_auto_upgrade=not is_custom_plan,
                )
            return True
        except stripe.error.StripeError as e:
            raise ValidationError({"detail": e.user_message or str(e)})

        except Exception as e:
            raise ValidationError({"detail": str(e)})

    def process_company_status_after_successful_payment(
        self, company, invoice, period_start
    ):
        """Handle company status transitions and notifications after a successful payment."""
        contract = company.contract
        # Terminate the contract when the last invoice is paid
        if (
            contract.cancel_at
            and get_a_day_in_next_month(contract.end_date, target_date=5).date()
            <= to_datetime(invoice.effective_at).date()
        ):
            # Update company status
            self.change_status_of_company(
                company, CompanyStatus.CONTRACT_TERMINATED.value
            )
            self.mail_service.send_contract_cancelled(
                recipient=company.responsible_person_mail,
                company_name=company.name,
                responsible_name=company.responsible_person_name,
                end_date=format_date(contract.end_date, style="jp_date"),
            )
        elif company.status not in [
            CompanyStatus.CONTRACT_TERMINATED.value,
            CompanyStatus.ACTIVE_CONTRACT.value,
        ]:
            # Check status of invoice in company
            is_exists_past_due_invoice = CompanyTransaction.objects.filter(
                company=company,
                type=CompanyTransactionTypes.INVOICE.value,
                status=TransactionStatus.PAYMENT_FAILED.value,
            ).exists()
            # If haven't any past due invoice and company status is suspended
            if (
                not is_exists_past_due_invoice
                and company.status == CompanyStatus.SUSPENDED.value
            ):
                # Send mail notify service restore
                self.mail_service.send_service_restored(
                    recipient=company.responsible_person_mail,
                    company_name=company.name,
                    responsible_name=company.responsible_person_name,
                )
                # Update company status
                self.change_status_of_company(
                    company,
                    (
                        CompanyStatus.CANCELLATION_PENDING.value
                        if contract.cancel_at
                        and contract.cancel_at <= period_start
                        else CompanyStatus.ACTIVE_CONTRACT.value
                    ),
                )
                self.reload_users_permissions(company)

            # If company in retry period, change status
            if company.status == CompanyStatus.RETRY_PAYMENT.value:
                # Update company status
                self.change_status_of_company(
                    company,
                    (
                        CompanyStatus.CANCELLATION_PENDING.value
                        if contract.cancel_at
                        and contract.cancel_at <= period_start
                        else CompanyStatus.ACTIVE_CONTRACT.value
                    ),
                )

    def downgrade_plan(self, company, updated_at):
        """
        Automatically downgrade a company's plan based on the number of users.
        Args:
            company (Company): The company whose plan will be downgraded.
            updated_at (datetime, optional): The timestamp for the downgrade.

        Returns:
            bool: True if a downgrade occurred, False if no change was needed.

        Raises:
            ValidationError: If Stripe fails to update the subscription or any unexpected error occurs.
        """
        # Handle check max user
        company_user_count = company.users.count()
        current_plan = company.company_plan.plan
        filter = Q()
        if company_user_count <= LIMIT_PERSON_PLAN_1_10:
            filter = Q(limit_person=LIMIT_PERSON_PLAN_1_10)
        elif company_user_count <= LIMIT_PERSON_PLAN_11_20:
            filter = Q(limit_person=LIMIT_PERSON_PLAN_11_20)
        elif company_user_count <= LIMIT_PERSON_PLAN_21_30:
            filter = Q(limit_person=LIMIT_PERSON_PLAN_21_30)
        else:
            return
        plan = Plan.objects.filter(filter).first()
        if plan != current_plan:
            self.update_new_plan(company, plan)
            if company.payment_type == PaymentTypes.CREDIT_CARD.value:
                self.stripe_service.change_price_of_subscription(company)
            # Update history use plan
            company.transactions.filter(
                type=CompanyTransactionTypes.PLAN.value,
                plan_end_at__isnull=True,
            ).update(plan_end_at=updated_at)
            company.transactions.create(
                type=CompanyTransactionTypes.PLAN.value,
                plan_start_at=updated_at,
                plan=plan,
            )
        return True

    def reload_users_permissions(self, company):
        """Reload and broadcast updated permissions for users in a given company."""
        users = company.users.filter(
            roles__permissions__name__startswith=Screens.PAYMENT_MANAGEMENT.value,
            roles__role_details__selection_result=SelectionResultOptions.ALLOWED.value,
        ).all()
        for user in users:
            send_web_socket_event(
                {
                    "user": UserPermissionsSerializer(user).data,
                    "action": WebSocketEventType.UPDATE_PERMISSIONS.value,
                },
                user=user,
            )
