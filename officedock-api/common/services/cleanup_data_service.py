from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.utils.timezone import now

from companies.models import Company
from thanks_messages.models import ThanksMessage


class CleanupDataService:
    def cleanup_data_thanks_messages(self, today, companies=None):
        """
        Cleanup soft-deleted thanks messages after retention period
        """
        # Convert date to datetime at start of day for proper calculation
        today_datetime = now().replace(
            year=today.year,
            month=today.month,
            day=today.day,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        threshold_date = today_datetime - timedelta(
            days=settings.THANKS_MESSAGE_SOFT_DELETE_RETENTION_DAYS
        )
        tks_msgs = ThanksMessage.objects.filter(
            deleted_at__isnull=False, deleted_at__lt=threshold_date
        )

        if companies:
            tks_msgs = tks_msgs.filter(company__in=companies)

        deleted_count, _ = tks_msgs.delete()

        return deleted_count

    def cleanup_data_company_contracts(self, today, companies=None):
        """
        Cleanup companies whose contracts ended after the 2-month retention period
        """
        if not companies:
            companies = Company.objects.all()

        today_datetime = now().replace(
            year=today.year,
            month=today.month,
            day=today.day,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        threshold_date = today_datetime - relativedelta(
            months=settings.COMPANY_CONTRACT_RETENTION_MONTHS
        )
        deleted_count, _ = companies.filter(
            contract__end_date__isnull=False,
            contract__end_date__lt=threshold_date,
        ).delete()

        return deleted_count
