from django.db import models

from organizations.constants import OrganizationTypes


class UserOrganizationWithoutCalendarTypeManager(models.Manager):
    """
    Custom manager that returns only organizations of type 'CALENDAR'.
    Use this when you want to work specifically with calendar-related organizations.
    """

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                organization__type__in=[
                    OrganizationTypes.NORMAL.value,
                    OrganizationTypes.PROJECT.value,
                ]
            )
        )


class OrganizationWithoutCalendarTypeManager(models.Manager):
    """
    Custom manager that excludes organizations of type 'CALENDAR'.
    Use this when you want to work only with NORMAL or PROJECT organizations.
    """

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                type__in=[
                    OrganizationTypes.NORMAL.value,
                    OrganizationTypes.PROJECT.value,
                ]
            )
        )
