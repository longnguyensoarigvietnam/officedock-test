from datetime import datetime, time
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from tasks.models import TaskDuration
from tasks.utils import split_date_range
from users.models import User
from common.utils import calculate_company_dates
from base.messages import ERROR_MESSAGES


def separate_duration(
    duration, end_date, is_get_new_durations=False, user=None
):
    """
    Handle update and create duration by intervals
    """
    if not isinstance(user, User):
        user = get_object_or_404(User, id=user)

    durations = []
    intervals = split_date_range(duration.started_at, end_date)
    _, first_end_time = intervals.pop(0)
    duration.paused_at = first_end_time
    duration.save()
    durations.append(duration)
    for start, end in intervals:
        task_duration = TaskDuration.objects.create(
            task_id=duration.task_id,
            schedule_id=duration.schedule_id,
            started_at=start,
            paused_at=end,
            user=user,
        )
        durations.append(task_duration)
    return durations if is_get_new_durations else True


def separate_duration_while_keep_running(duration, end_date, user=None):
    """
    Handle update and create duration by intervals
    """
    if duration.started_at.date() < timezone.now().date():
        intervals = split_date_range(duration.started_at, end_date)
        _, first_end_time = intervals.pop(0)
        duration.paused_at = first_end_time
        duration.save()
        if len(intervals) >= 1:
            last_date_start, _ = intervals.pop(-1)
            # Create duration continue running
            TaskDuration.objects.create(
                task_id=duration.task_id,
                schedule=duration.schedule,
                started_at=last_date_start,
                paused_at=None,
                user=user,
            )
        if intervals is not []:
            for start, end in intervals:
                TaskDuration.objects.create(
                    task_id=duration.task_id,
                    schedule=duration.schedule,
                    started_at=start,
                    paused_at=end,
                    user=user,
                )
    return


def normalize_dt(value):
    """Normalize datetime for consistent comparison."""
    if not value:
        return None

    # Convert string (handle both ISO8601 and 'Z' timezone formats)
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None  # invalid string → skip

    # Normalize by removing seconds and microseconds to avoid tiny mismatches
    return value.replace(second=0, microsecond=0)


def validate_editable_actual_duration(
    instance, started_at=None, paused_at=None, is_deleted=False
):
    """
    Validate range editable after close date
    """
    if instance:
        date_now = datetime.now().date()
        instance_created_at = instance.created_at
        instance_started_at = normalize_dt(instance.started_at)
        instance_paused_at = normalize_dt(instance.paused_at)
        company_dates = calculate_company_dates(instance.company)
        date_after_closing = company_dates["date_after_closing"]
        start_of_day = company_dates["start_date_calculation_deadline"]
        date_after_data_edit_deadline = company_dates[
            "date_after_data_edit_deadline"
        ]
        started_at = normalize_dt(started_at)
        paused_at = normalize_dt(paused_at)

        if date_now >= date_after_data_edit_deadline:
            start_of_day = date_after_closing

        if instance_created_at < datetime.combine(
            start_of_day, time.min, tzinfo=instance_created_at.tzinfo
        ):
            if (
                is_deleted
                or (started_at and instance_started_at != started_at)
                or (paused_at and instance_paused_at != paused_at)
            ):
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["cannot_edit_duration"]}
                )
