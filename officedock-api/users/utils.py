import calendar
from datetime import datetime
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from chat.constants import WebSocketEventType
from common.utils import send_web_socket_event
from users.models import TaskRewardLog, User, UserCoinLot


def reset_sort_task(user):
    """
    Reset sort task for user
    """
    if isinstance(user, User) and hasattr(user, "setting"):
        if (
            user.setting.is_sorting_task_by_deadline
            or user.setting.is_sorting_task_by_important
        ):
            user.setting.reset_sort_task()
            send_web_socket_event(
                {
                    "is_sorting_task_by_deadline": False,
                    "is_sorting_task_by_important": False,
                    "action": WebSocketEventType.RESET_STATUS_SORT_TASK.value,
                },
                user=user,
            )


def get_current_completed_task(user):
    """
    Get monthly completed task count
    """
    now = timezone.now()

    # first day of month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # last day of month
    last_day = calendar.monthrange(now.year, now.month)[1]

    month_end = now.replace(
        day=last_day, hour=23, minute=59, second=59, microsecond=999999
    )

    completed_count = TaskRewardLog.objects.filter(
        user=user,
        created_at__gte=month_start,
        created_at__lte=month_end,
    ).count()

    return completed_count


def get_total_coin_expire_this_month(user):
    """
    Get coin expire this month
    """
    now = timezone.now()

    # first day of month
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # last day of month
    last_day = calendar.monthrange(now.year, now.month)[1]

    month_end = now.replace(
        day=last_day, hour=23, minute=59, second=59, microsecond=999999
    )

    total_amount_expire = UserCoinLot.objects.filter(
        user=user,
        expires_at__gte=month_start,
        expires_at__lte=month_end,
    ).aggregate(total=Sum("amount_remaining"))["total"]

    return total_amount_expire or 0


def calculate_coin_expires_at(granted_at: datetime):
    """
    Calculate coin expiration time based on monthly expiration rule.
    Coins expire at the end of the target month.
    """

    month_start = granted_at.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    target_month = month_start + relativedelta(
        months=settings.MONTHLY_COIN_EXPIRATION
    )

    last_day = calendar.monthrange(target_month.year, target_month.month)[1]

    return target_month.replace(
        day=last_day,
        hour=23,
        minute=59,
        second=59,
        microsecond=999999,
    )
