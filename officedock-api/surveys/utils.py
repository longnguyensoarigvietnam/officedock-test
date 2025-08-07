from datetime import datetime
from django.utils.timezone import now


def is_open_survey(end_at: datetime):
    """Check survey is open"""
    return end_at > now()
