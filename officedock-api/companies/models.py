from django.db import models

from base.models import BaseModel
from companies.managers import AllCompanyManager, OnlyCompanyManager
from companies.constants import ContractStatus


class Company(BaseModel):
    """
    Company Model.
    """

    objects = OnlyCompanyManager()
    all_objects = AllCompanyManager()

    name = models.CharField()

    def __str__(self):
        return self.name


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
