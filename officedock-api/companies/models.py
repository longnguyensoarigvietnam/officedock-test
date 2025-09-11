from django.db import models

from base.models import BaseModel
from companies.managers import AllCompanyManager, OnlyCompanyManager
from companies.constants import ContractStatus
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
    max_user_count = models.IntegerField(default=0)
    max_user_at = models.DateTimeField(null=True, blank=True)
    stripe_customer_id = models.CharField(null=True, blank=True)
    status = models.CharField(
        max_length=100,
        choices=ContractStatus.choices(),
        default=ContractStatus.TEMPORARY_USAGE.value,
    )

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

    # TODO: Fix after when implement logic plan contract
    @property
    def exchangeable_amount(self):
        return 6000

    @property
    def max_exchange_per_user(self):
        return 300

    @property
    def min_exchange_per_user(self):
        return 300


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
    system_main_purpose = models.CharField(null=True, blank=True)
    implementation_main_issue = models.CharField(null=True, blank=True)
    industry = models.CharField(null=True, blank=True)
    address = models.CharField(null=True, blank=True)
    phone = models.CharField(null=True, blank=True)
    responsible_person_name = models.CharField(null=True, blank=True)
    responsible_person_mail = models.EmailField(null=True, blank=True)


class CompanyPlan(BaseModel):
    """
    CompanyPlan model
    """

    company = models.OneToOneField(
        "companies.Company",
        related_name="plan",
        on_delete=models.CASCADE,
    )
    plan = models.ForeignKey(
        "plans.Plan",
        related_name="company_plans",
        on_delete=models.CASCADE,
    )
    stripe_subscription_id = models.CharField(null=True, blank=True)
    stripe_subscription_item_id = models.CharField(null=True, blank=True)


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


# FIXME: Create table payment_history
