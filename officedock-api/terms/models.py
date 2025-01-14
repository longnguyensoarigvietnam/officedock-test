from django.db import models

from base.models import BaseModel
from terms.constants import TermStatus, TermTypes


class Term(BaseModel):
    """
    Term model
    """

    status = models.CharField(max_length=50, choices=TermStatus.choices())
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50, choices=TermTypes.choices())
    period_start = models.DateField(blank=True, null=True)
    period_end = models.DateField(blank=True, null=True)
