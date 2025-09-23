from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.utils.timezone import now

from companies.models import Company
from thanks_messages.models import ThanksMessage


class CleanupDataService:
    def cleanup_data_thanks_messages(self):
        """
        Cleanup soft-deleted thanks messages after retention period
        """
        threshold_date = now().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=settings.THANKS_MESSAGE_SOFT_DELETE_RETENTION_DAYS)
        deleted_count, _ = ThanksMessage.objects.filter(
            deleted_at__isnull=False, deleted_at__lt=threshold_date
        ).delete()

        return deleted_count

    def cleanup_data_company_contracts(self):
        """
        Cleanup companies whose contracts ended after the 2-month retention period
        """
        threshold_date = now().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - relativedelta(months=settings.COMPANY_CONTRACT_RETENTION_MONTHS)
        deleted_count, _ = Company.objects.filter(
            contract__cancel_at__isnull=False,
            contract__cancel_at__lt=threshold_date,
        ).delete()

        return deleted_count
