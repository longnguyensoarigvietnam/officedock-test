from django.conf import settings
from django.db.models import Manager

from common.utils import calculate_company_dates


class ThanksMessageManager(Manager):
    """
    Define thanks message manager
    """

    def sent_this_month(self, user):
        company_dates = calculate_company_dates(user.company)
        start_date_calculation_deadline = company_dates[
            "start_date_calculation_deadline"
        ]
        date_after_closing = company_dates["date_after_closing"]
        return self.filter(
            sender=user,
            created_at__gte=start_date_calculation_deadline,
            created_at__lt=date_after_closing,
        )

    def remaining_quota(self, user):
        count = self.sent_this_month(user).count()
        return max(settings.MONTHLY_QUOTA_THANKS_MESSAGES - count, 0)

    def unread_for(self, user):
        return self.filter(recipient=user, read_at__isnull=True)

    def unread_count(self, user):
        return self.unread_for(user).count()
