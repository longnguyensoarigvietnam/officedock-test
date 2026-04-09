from django.db import models
from base.models import BaseModel


class Tag(BaseModel):
    """
    Tag model
    """

    name = models.CharField(max_length=255)
    furigana = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Furigana or phonetic reading of the tag name (e.g., ふりがな)",
    )
    organizations = models.ManyToManyField(
        "organizations.Organization",
        through="OrganizationsTags",
        related_name="tags",
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="tags",
        on_delete=models.CASCADE,
    )

    def get_calendar_organization(self):
        """
        Get all organizations
        """
        calendar_org = self.company.get_calendar_organization()
        return self.organization_tags.filter(organization=calendar_org).first()


class OrganizationsTags(BaseModel):
    """
    The organizations of the tags
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="organization_tags",
    )
    tag = models.ForeignKey(
        "Tag", on_delete=models.CASCADE, related_name="organization_tags"
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="organization_tags",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.organization.company
        super().save(*args, **kwargs)
