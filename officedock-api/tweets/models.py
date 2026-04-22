from django.db import models

from base.models import BaseModel


class Tweet(BaseModel):
    """
    Tweet model
    """

    company = models.ForeignKey(
        "companies.Company", related_name="tweets", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        "users.User",
        related_name="tweets",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    content = models.CharField()
    is_system = models.BooleanField(default=False)
