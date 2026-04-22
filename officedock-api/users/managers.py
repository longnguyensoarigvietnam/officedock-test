from django.contrib.auth.models import UserManager
from django.db.models import QuerySet


class ActiveUsersOnlyManager(UserManager):
    """
    The active users only
    """

    use_for_related_fields = True

    def get_queryset(self) -> QuerySet:
        """
        Exclude inactive users and users have company soft deleted
        """

        return (
            super()
            .get_queryset()
            .filter(
                is_active=True,
            )
        )

    def create_superuser(self, email=None, password=None, **extra_fields):
        """
        Custom to create superuser with default username is email
        """
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(email=email, password=password, **extra_fields)
