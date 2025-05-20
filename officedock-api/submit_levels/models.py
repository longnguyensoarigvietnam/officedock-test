from base.models import BaseModel
from django.db import models

from skills.constants import SkillLevel, SkillStep
from submit_levels.constants import SubmitLevelStatus


class SubmitLevelHistory(BaseModel):
    """
    Submit Level History model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="submit_level_histories",
        on_delete=models.CASCADE,
    )
    staff = models.ForeignKey(
        "users.User",
        related_name="submit_level_histories",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="submit_level_histories",
        on_delete=models.CASCADE,
    )
    skill = models.ForeignKey(
        "skills.Skill",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="submit_level_histories",
    )
    step_before_submit = models.CharField(
        max_length=25, null=True, blank=True, choices=SkillStep.choices()
    )
    step_after_submit = models.CharField(
        max_length=25, null=True, blank=True, choices=SkillStep.choices()
    )
    level_before_submit = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=SkillLevel.choices(),
    )
    level_after_submit = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        choices=SkillLevel.choices(),
    )
    status = models.CharField(
        max_length=50,
        default=SubmitLevelStatus.APPLYING.value,
        choices=SubmitLevelStatus.choices(),
    )
    comment = models.TextField(null=True, blank=True)
    approver = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="accepted_submit_levels",
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.staff.company

        super().save(*args, **kwargs)
