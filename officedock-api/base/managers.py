from django.db.models import Manager, QuerySet


class WithoutSoftDeleteManager(Manager):
    """
    Custom manager that returns only objects that have not been soft-deleted.

    This manager excludes all records where 'deleted_at' is not null.
    Useful as the default manager for most application logic.
    Also used in related fields (e.g., reverse ForeignKey) by setting
    `use_for_related_fields = True`.
    """

    use_for_related_fields = True

    def get_queryset(self) -> QuerySet:
        """
        Return a QuerySet containing only objects where 'deleted_at' is null.

        Returns:
            QuerySet: A queryset excluding soft-deleted records.
        """
        return super().get_queryset().filter(deleted_at__isnull=True)


class WithSoftDeleteManager(Manager):
    """
    Custom manager that returns all objects, including soft-deleted ones.

    Useful for admin interfaces, logs, or recovery tools where you need to
    access both active and soft-deleted records.
    """

    def get_queryset(self) -> QuerySet:
        """
        Return a QuerySet containing all objects, regardless of 'deleted_at' status.

        Returns:
            QuerySet: A queryset including both soft-deleted and active records.
        """
        return super().get_queryset()
