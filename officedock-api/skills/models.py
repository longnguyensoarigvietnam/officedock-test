import uuid

from django.db import models

from base.models import BaseModel
from skills.constants import (
    SkillLevel as SkillLevelConstants,
    SkillStep,
    LookBackTypes,
)


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

    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="skills",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="skills",
        on_delete=models.CASCADE,
    )
    parent = models.ForeignKey(
        "self",
        related_name="parent_skill",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    description = models.TextField(null=True, blank=True)
    step = models.CharField(
        choices=SkillStep.choices(),
        max_length=20,
        default=SkillStep.STEP_1.value,
    )
    name = models.CharField(
        max_length=255,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)


class SkillLevel(BaseModel):
    """
    Skill Level model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="skill_levels",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="skill_levels",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    skill = models.ForeignKey(
        "skills.Skill",
        related_name="skill_levels",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    level = models.CharField(
        max_length=20,
        default=SkillLevelConstants.LEVEL_1.value,
        choices=SkillLevelConstants.choices(),
    )
    items = models.JSONField(null=True, blank=True)
    measure_count = models.IntegerField(null=True, blank=True, default=0)
    measure_time = models.IntegerField(null=True, blank=True, default=0)
    look_back_interval = models.IntegerField(null=True, blank=True)
    look_back_type = models.CharField(
        max_length=255, null=True, blank=True, choices=LookBackTypes.choices()
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.skill.company
        super().save(*args, **kwargs)


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
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    skill_parent = models.ForeignKey(
        "skills.Skill",
        related_name="skill_maps_skill_parent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    step = models.CharField(
        choices=SkillStep.choices(),
        max_length=20,
        default=SkillStep.STEP_1.value,
    )
    is_valid = models.BooleanField(default=False)
    is_complete = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)


class SkillMapSkillLevel(BaseModel):
    """
    Skill Map Skill Level model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="skill_map_skill_levels",
        on_delete=models.CASCADE,
    )
    skill_map = models.ForeignKey(
        "skills.SkillMap",
        related_name="skill_map_skill_levels",
        on_delete=models.CASCADE,
    )
    skill_level = models.ForeignKey(
        "skills.SkillLevel",
        related_name="skill_map_skill_levels",
        on_delete=models.CASCADE,
    )
    level = models.CharField(
        max_length=20,
        default=SkillLevelConstants.LEVEL_1.value,
        choices=SkillLevelConstants.choices(),
    )
    measure_count = models.IntegerField(null=True, blank=True, default=0)
    actual_measure_count = models.IntegerField(null=True, blank=True, default=0)
    measure_time = models.IntegerField(null=True, blank=True, default=0)
    actual_measure_time = models.IntegerField(null=True, blank=True, default=0)
    items = models.JSONField(null=True, blank=True)
    look_back_interval = models.IntegerField(null=True, blank=True)
    look_back_type = models.CharField(
        max_length=255, null=True, blank=True, choices=LookBackTypes.choices()
    )
    start_lookback_at = models.DateTimeField(null=True, blank=True)
    next_submit_at = models.DateTimeField(null=True, blank=True)
    is_complete = models.BooleanField(default=False)
