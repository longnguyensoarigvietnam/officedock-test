from django.db import models
from users.constants import RoleTypes


class OnlyCompanyManager(models.Manager):
    """
    Custom manager to exclude companies associated with Operation Admin role
    """

    def get_queryset(self):
        """
        Retrieves companies excluding those associated with Operation Admin role
        """

        return (
            super()
            .get_queryset()
            .exclude(users__roles__name=RoleTypes.OPERATION_ADMIN.value)
        )


class AllCompanyManager(models.Manager):
    """
    Custom manager to retrieve all companies
    """

    def get_queryset(self):
        """
        Retrieves all companies
        """

        return super().get_queryset()
