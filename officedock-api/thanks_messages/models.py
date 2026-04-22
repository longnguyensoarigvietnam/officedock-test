from django.db import models

from base.models import BaseModel
from companies.models import Company
from thanks_messages.managers import ThanksMessageManager
from users.models import User


class ThanksMessage(BaseModel):
    """
    Thanks message model
    """

    objects = ThanksMessageManager()

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="thanks_messages"
    )
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_thanks"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_thanks"
    )
    message = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["recipient", "read_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.sender.company
        super().save(*args, **kwargs)
