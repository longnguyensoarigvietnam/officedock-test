from django.db import models
from django.utils.timezone import now

from base.managers import WithSoftDeleteManager, WithoutSoftDeleteManager


class BaseModel(models.Model):
    """
    The base model class
    """

    objects = WithSoftDeleteManager()
    active_objects = WithoutSoftDeleteManager()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = now()
        self.save(update_fields=["deleted_at"])

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])
