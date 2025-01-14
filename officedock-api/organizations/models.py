from django.db import models
from base.models import BaseModel


class Organization(BaseModel):
    """
    Organization model.
    """

    name = models.CharField(max_length=255)
    company = models.ForeignKey(
        "companies.Company",
        related_name="organizations",
        on_delete=models.CASCADE,
    )
    superior = models.ForeignKey(
        "self",
        related_name="organizations",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    users = models.ManyToManyField(
        "users.User", through="UsersOrganizations", related_name="organizations"
    )
    statistic_categories = models.ManyToManyField(
        "skills.StatisticCategory",
        through="OrganizationsStatisticCategories",
        related_name="organizations",
        through_fields=("organization", "large_statistic_category"),
    )
    skills = models.ManyToManyField(
        "skills.Skill",
        through="OrganizationsSkills",
        related_name="organizations",
        through_fields=("organization", "skill"),
    )


class UsersOrganizations(BaseModel):
    """
    Users Organizations model.
    """

    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    organization = models.ForeignKey("Organization", on_delete=models.CASCADE)
    company = models.ForeignKey(
        "companies.Company",
        related_name="users_organizations",
        on_delete=models.CASCADE,
    )
    is_main = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.user.company
        super().save(*args, **kwargs)


class OrganizationsStatisticCategories(BaseModel):
    """
    Organizations Statistic Categories model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="organizations_statistic_categories",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "Organization",
        on_delete=models.CASCADE,
        related_name="organizations_statistic_categories",
    )
    large_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="organizations_large_statistic_categories",
    )
    medium_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="organizations_medium_statistic_categories",
    )
    small_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="organizations_small_statistic_categories",
    )
    index = models.IntegerField(null=True, default=1)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)


class OrganizationsSkills(BaseModel):
    """
    Organizations Skills model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="organizations_skills",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "Organization",
        on_delete=models.CASCADE,
        related_name="organizations_skills",
    )
    skill = models.ForeignKey(
        "skills.Skill",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="organizations_skills",
    )
    define_skill = models.TextField(null=True, blank=True)
    index = models.IntegerField(null=True, default=1)
    levels = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)


class OrganizationsStatisticCategoriesSkills(BaseModel):
    """
    Organizations statistic categories skills model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="organizations_statistic_categories_skills",
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        "Organization",
        on_delete=models.CASCADE,
        related_name="organizations_statistic_categories_skills",
    )
    organization_statistic_category = models.ForeignKey(
        "OrganizationsStatisticCategories",
        on_delete=models.CASCADE,
        related_name="organizations_statistic_categories_skills",
    )
    skill = models.ForeignKey(
        "skills.Skill",
        on_delete=models.CASCADE,
        related_name="organizations_statistic_categories_skills",
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)
