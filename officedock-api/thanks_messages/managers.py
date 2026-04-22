from datetime import datetime
from django.conf import settings
from django.db.models import Manager

from common.utils import calculate_company_dates


class ThanksMessageManager(Manager):
    """
    Define thanks message manager
    """

    def sent_this_month(self, user, date=None):
        company_dates = calculate_company_dates(user.company, date)
        date_after_closing = company_dates["date_after_closing_this_month"]
        start_month = datetime(
            year=date_after_closing.year,
            month=date_after_closing.month,
            day=date_after_closing.day,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        end_month = company_dates["date_after_closing_next_month"]

        return self.filter(
            sender=user,
            created_at__gte=start_month,
            created_at__lt=end_month,
        )

    def remaining_quota(self, user, date=None):
        count = self.sent_this_month(user, date).count()
        return max(settings.MONTHLY_QUOTA_THANKS_MESSAGES - count, 0)

    def unread_for(self, user):
        return self.filter(recipient=user, read_at__isnull=True)

    def unread_count(self, user):
        return self.unread_for(user).count()
