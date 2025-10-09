from django.db import models

from base.models import BaseModel
from companies.managers import AllCompanyManager, OnlyCompanyManager
from companies.constants import CompanyStatus, CompanyTransactionTypes
from organizations.constants import (
    CALENDAR_ORGANIZATION_NAME,
    OrganizationTypes,
)
from organizations.models import Organization


class Company(BaseModel):
    """
    Company Model.
    """

    objects = OnlyCompanyManager()
    all_objects = AllCompanyManager()

    name = models.CharField()
    # Settings for company
    is_show_holidays_calendar = models.BooleanField(default=False)
    max_user_in_contract_period = models.IntegerField(default=0)
    max_user_at = models.DateTimeField(null=True, blank=True)
    stripe_customer_id = models.CharField(null=True, blank=True)
    status = models.CharField(
        max_length=100, choices=CompanyStatus.choices(), null=True, blank=True
    )
    responsible_person_name = models.CharField(null=True, blank=True)
    responsible_person_mail = models.EmailField(null=True, blank=True)

    # Current total coins (can be computed as the sum of valid CompanyCoin records)
    total_coins = models.IntegerField(default=0)
    coins_remaining = models.IntegerField(default=0)

    # Number of users currently assigned coins (used to calculate coins per user)
    target_user_count = models.IntegerField(default=0)

    # Define close date and editable after closing
    close_date = models.IntegerField(default=1)
    editable_after_closing = models.IntegerField(default=10)

    def __str__(self):
        return self.name

    def get_calendar_organization(self):
        """
        Get all organizations
        """
        calendar_org, _ = Organization.all_objects.get_or_create(
            company=self,
            type=OrganizationTypes.CALENDAR.value,
            defaults={"name": CALENDAR_ORGANIZATION_NAME},
        )
        return calendar_org

    @property
    def exchangeable_amount(self):
        return (
            self.company_plan.plan.exchangeable_amount
            if hasattr(self, "company_plan")
            and hasattr(self.company_plan, "plan")
            else 0
        )


class Contract(BaseModel):
    """
    Contract Model.
    """

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    company = models.OneToOneField(
        "companies.Company",
        related_name="contract",
        on_delete=models.CASCADE,
    )
    next_renewal_at = models.DateTimeField(null=True, blank=True)
    system_main_purpose = models.JSONField(null=True, blank=True)
    department = models.JSONField(null=True, blank=True)
    industry = models.CharField(null=True, blank=True)
    address = models.CharField(null=True, blank=True)
    phone = models.CharField(null=True, blank=True)
    cancel_at = models.DateTimeField(null=True, blank=True)


class CompanyPlan(BaseModel):
    """
    CompanyPlan model
    """

    company = models.OneToOneField(
        "companies.Company",
        related_name="company_plan",
        on_delete=models.CASCADE,
    )
    plan = models.ForeignKey(
        "plans.Plan",
        related_name="company_plans",
        on_delete=models.CASCADE,
    )
    stripe_subscription_id = models.CharField(null=True, blank=True)


class CompanyPaymentMethod(BaseModel):
    """
    CompanyPaymentMethod model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="payment_methods",
        on_delete=models.CASCADE,
    )
    type = models.CharField(null=True, blank=True)
    stripe_payment_method_id = models.CharField(null=True, blank=True)
    stripe_fingerprint = models.CharField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    is_retry_failed = models.BooleanField(default=False)
    brand = models.CharField(null=True, blank=True)
    last4 = models.CharField(null=True, blank=True)
    exp_month = models.CharField(null=True, blank=True)
    exp_year = models.CharField(null=True, blank=True)


class CompanyTransaction(BaseModel):
    """
    CompanyTransaction model
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    type = models.CharField(choices=CompanyTransactionTypes.choices())
    invoice_target = models.DateField(null=True, blank=True)
    plan_start_at = models.DateTimeField(null=True, blank=True)
    plan_end_at = models.DateTimeField(null=True, blank=True)
    plan = models.ForeignKey(
        "plans.Plan", on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    stripe_invoice_id = models.CharField(null=True, blank=True)
    amount_point = models.IntegerField(null=True, blank=True)
    retry_attempt = models.IntegerField(default=0)
