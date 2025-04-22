import uuid

from django.db import models

from base.models import BaseModel
from skills.constants import SkillLevel


class StatisticCategory(BaseModel):
    """
    Statistic Category model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="statistic_categories",
        on_delete=models.CASCADE,
    )
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    name = models.CharField(
        max_length=255,
    )
    team = models.ForeignKey(
        "organizations.Organization",
        related_name="team_statistic_categories",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )


class Skill(BaseModel):
    """
    Skill model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="skills",
        on_delete=models.CASCADE,
    )
    name = models.CharField(
        max_length=255,
    )


class SkillMap(BaseModel):
    """
    Skill Map model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="skill_maps",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="skill_maps",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    staff = models.ForeignKey(
        "users.User",
        related_name="skill_maps",
        on_delete=models.CASCADE,
    )
    skill = models.ForeignKey(
        "skills.Skill",
        related_name="skill_maps",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    index = models.IntegerField(null=True, default=1)
    point = models.IntegerField(null=True, blank=True, default=0)
    level = models.CharField(
        max_length=20,
        default=SkillLevel.LEVEL_0.value,
        choices=SkillLevel.choices(),
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)


class SkillMapHistory(BaseModel):
    """
    Skill Map history model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="skill_map_histories",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "users.User",
        related_name="skill_map_histories",
        on_delete=models.CASCADE,
    )
    statistic_category_name = models.CharField(
        max_length=255, null=True, blank=True
    )
    statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        related_name="skill_map_histories",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    superior_statistic_category_name = models.CharField(
        max_length=255, null=True, blank=True
    )
    superior_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        related_name="superior_statistic_category_map_histories",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    point = models.IntegerField(null=True, blank=True, default=0)
    level = models.CharField(
        max_length=20,
        default=SkillLevel.LEVEL_0.value,
        choices=SkillLevel.choices(),
    )
