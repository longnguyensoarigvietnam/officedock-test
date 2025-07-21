import uuid

from django.core.validators import FileExtensionValidator
from django.db import models

from base.models import BaseModel
from organizations.constants import CategoryColors
from common.constants import (
    ALLOW_IMAGE_FORMATS,
    ORGANIZATION_ICON_FOLDER_UPLOAD,
)
from organizations.constants import OrganizationTypes
from organizations.managers import (
    OrganizationWithoutCalendarTypeManager,
    UserOrganizationWithoutCalendarTypeManager,
)
from users.constants import AvatarColors


class Organization(BaseModel):
    """
    Organization model.
    """

    objects = OrganizationWithoutCalendarTypeManager()
    all_objects = models.Manager()
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    icon = models.ImageField(
        upload_to=ORGANIZATION_ICON_FOLDER_UPLOAD,
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOW_IMAGE_FORMATS),
        ],
        null=True,
        blank=True,
    )
    icon_color = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255)
    type = models.CharField(
        max_length=50,
        choices=OrganizationTypes.choices(),
        default=OrganizationTypes.NORMAL.value,
    )
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
    hierarchize_at = models.DateTimeField(null=True, blank=True)
    users = models.ManyToManyField(
        "users.User", through="UsersOrganizations", related_name="organizations"
    )
    statistic_categories = models.ManyToManyField(
        "skills.StatisticCategory",
        through="OrganizationsStatisticCategories",
        related_name="organizations",
        through_fields=("organization", "large_statistic_category"),
    )

    def save(self, *args, **kwargs):
        """
        Set icon color default
        """
        if self.icon_color is None:
            self.icon_color = AvatarColors.random()
        super().save(*args, **kwargs)


class UsersOrganizations(BaseModel):
    """
    Users Organizations model.
    """

    objects = UserOrganizationWithoutCalendarTypeManager()
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
        self.company_id = self.user.company_id
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
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organizations_large_statistic_categories",
    )
    medium_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organizations_medium_statistic_categories",
    )
    small_statistic_category = models.ForeignKey(
        "skills.StatisticCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organizations_small_statistic_categories",
    )
    index = models.IntegerField(null=True, default=1)
    color = models.CharField(max_length=20, blank=True, null=True)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        if self.color is None:
            self.color = CategoryColors.random()

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


class Step(BaseModel):
    """
    Step model.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        related_name="steps",
        on_delete=models.CASCADE,
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="steps",
        on_delete=models.CASCADE,
    )
    define_step_1 = models.CharField(max_length=255, null=True, blank=True)
    define_step_2 = models.CharField(max_length=255, null=True, blank=True)
    define_step_3 = models.CharField(max_length=255, null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)
