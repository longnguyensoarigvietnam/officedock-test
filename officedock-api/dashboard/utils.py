from django.shortcuts import get_object_or_404
from django.utils import timezone

from tasks.models import TaskDuration
from tasks.utils import split_date_range
from users.models import User


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
        if duration.schedule_id:
            task_duration = TaskDuration.objects.create(
                schedule_id=duration.schedule_id,
                started_at=start,
                paused_at=end,
                user=user,
            )
        elif duration.task_id:
            task_duration = TaskDuration.objects.create(
                task_id=duration.task_id,
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
