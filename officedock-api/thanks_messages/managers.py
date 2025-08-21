from django.conf import settings
from django.db.models import Manager
from django.utils.timezone import now


class ThanksMessageManager(Manager):
    """
    Define thanks message manager
    """

    def sent_this_month(self, user):
        # TODO: Update closing date to start time
        start_month = now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        return self.filter(sender=user, created_at__gte=start_month)

    def remaining_quota(self, user):
        count = self.sent_this_month(user).count()
        return max(settings.MONTHLY_QUOTA_THANKS_MESSAGES - count, 0)

    def unread_for(self, user):
        return self.filter(recipient=user, read_at__isnull=True)

    def unread_count(self, user):
        return self.unread_for(user).count()
