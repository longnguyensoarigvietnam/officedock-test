from django.db import models
from django.utils.timezone import now


class BaseModel(models.Model):
    """
    The base model class
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        self.deleted_at = now()
        self.save()
