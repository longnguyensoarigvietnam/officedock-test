from django.db import models

from base.models import BaseModel


class Plan(BaseModel):
    """
    Plan model
    """

    name = models.CharField()
    monthly_fee = models.FloatField()
    stripe_product_id = models.CharField(null=True, blank=True)
    stripe_price_id = models.CharField(null=True, blank=True)
    exchangeable_amount = models.IntegerField(
        default=0
    )  # Amount convertible to DotMoney
    limit_person = models.IntegerField(default=0)
    is_custom_plan = models.BooleanField(default=False)


class Tax(BaseModel):
    """
    Tax model
    """

    name = models.CharField()
    percentage = models.FloatField()
    stripe_tax_id = models.CharField(null=True, blank=True)
