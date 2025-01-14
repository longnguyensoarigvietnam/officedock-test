from django.db import models
from base.models import BaseModel


class Tag(BaseModel):
    """
    Tag model
    """

    name = models.CharField(max_length=255)
    responsible_person = models.ForeignKey(
        "users.User",
        related_name="tags",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    people_in_charge = models.ManyToManyField(
        "users.User",
        through="PeopleInChargeTags",
        related_name="in_charge_tags",
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="tags",
        on_delete=models.CASCADE,
    )


class PeopleInChargeTags(BaseModel):
    """
    The people in charge of the tags
    """

    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    tag = models.ForeignKey("Tag", on_delete=models.CASCADE)
    company = models.ForeignKey(
        "companies.Company",
        related_name="people_in_charge_tags",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.user.company
        super().save(*args, **kwargs)
