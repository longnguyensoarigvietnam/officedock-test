import random
from datetime import timedelta
from enum import Enum

from django.utils import timezone


class EnumChoices(Enum):
    @classmethod
    def keys(cls):
        return [choice.name for choice in cls]

    @classmethod
    def values(cls):
        return [choice.value for choice in cls]

    @classmethod
    def choices(cls):
        return [(choice.value, choice.name) for choice in cls]

    @classmethod
    def random(cls, not_values=None):
        if not_values is None:
            not_values = []
        choices = [
            choice.value for choice in cls if choice.value not in not_values
        ]
        return random.choice(choices)


ACCESS_TOKEN_LIFETIME = 4 * 60  # It's mean 4 hours
ACCESS_TOKEN_LIFETIME_REMEMBER = 30 * 24 * 60  # It's mean 30 days

# Constants token
DEFAULT_TOKEN_SECONDS_EXPIRATION = 60 * 60 * 24  # It's mean 24 hours
DEFAULT_TOKEN_HOURS_EXPIRATION = (
    DEFAULT_TOKEN_SECONDS_EXPIRATION / 60 / 60
)  # Show expired by hours

OTP_TOKEN_SECONDS_EXPIRATION = 10 * 60  # It's mean 10 minutes
OTP_TOKEN_MINUTES_EXPIRATION = (
    OTP_TOKEN_SECONDS_EXPIRATION / 60
)  # Show expired by minutes

REPLACE_NULL_DATE = timezone.now() - timedelta(
    days=365 * 1000
)  # Datetime in the past
REPLACE_NULL_DATE_WITH_FUTURE = timezone.now() + timedelta(
    days=365 * 1000
)  # Datetime in the future
