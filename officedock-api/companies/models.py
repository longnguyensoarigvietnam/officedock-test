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
    status = models.CharField(
        max_length=100,
        choices=ContractStatus.choices(),
        default=ContractStatus.NOT_SIGNED.value,
    )
    company = models.OneToOneField(
        "Company",
        related_name="contract",
        on_delete=models.CASCADE,
    )
