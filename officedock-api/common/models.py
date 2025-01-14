from django.db import models

from base.models import BaseModel
from companies.models import Company


class Category(BaseModel):
    """
    Category model
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="categories"
    )
    large_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="large_categories",
    )
    medium_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medium_categories",
    )
    small_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="small_categories",
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="categories",
    )
    schedule = models.ForeignKey(
        "calendars.Schedule",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="categories",
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.task:
            self.company = self.task.company
        if self.schedule:
            self.company = self.schedule.company

        super().save(*args, **kwargs)
