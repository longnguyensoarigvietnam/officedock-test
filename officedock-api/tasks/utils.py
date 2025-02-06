from datetime import datetime, timedelta, time

from tasks.constants import DatetimeUnitTypes
from tasks.models import Task, TaskSchedule, TodoList
from tasks.serializers import TaskScheduleSerializer, TodoListSerializer
from calendars.models import Schedule
from users.models import User


def split_date_range(plan_start_date, plan_end_date):
    """
    Split a time range into multiple day segments.
    """
    time_ranges = []

    if plan_start_date.date() != plan_end_date.date():
        # Handle the first day (from plan_start_date to end of that day)
        current_end_date = datetime.combine(
            plan_start_date.date(), time.max
        )  # 23:59:59 on the same day
        time_ranges.append((plan_start_date, current_end_date))

        # Loop through the middle days
        next_day = plan_start_date.date() + timedelta(days=1)
        while next_day < plan_end_date.date():
            start_of_day = datetime.combine(
                next_day, time.min
            )  # 00:00:00 on the next day
            end_of_day = datetime.combine(
                next_day, time.max
            )  # 23:59:59 on the same day
            time_ranges.append((start_of_day, end_of_day))
            next_day += timedelta(days=1)

        # Handle the last day (from 00:00:00 to plan_end_date)
        start_of_last_day = datetime.combine(
            plan_end_date.date(), time.min
        )  # 00:00:00 on the last day
        time_ranges.append((start_of_last_day, plan_end_date))
    else:
        # If the start and end date are the same day
        time_ranges.append((plan_start_date, plan_end_date))

    return time_ranges


def create_task_schedule(task: Task, schedule_data):
    """
    Create a new task schedule.
    """
    schedule_serializer = TaskScheduleSerializer(data=schedule_data)
    schedule_serializer.is_valid(raise_exception=True)
    plan_start_date = schedule_data.get("plan_start_date")
    plan_end_date = schedule_data.get("plan_end_date")

    # Loop over the time segments and create TaskSchedule for each
    time_segments = split_date_range(plan_start_date, plan_end_date)
    for start_time, end_time in time_segments:
        TaskSchedule.objects.create(
            task=task,
            plan_start_date=start_time,
            plan_end_date=end_time,
        )


def update_task_schedule(schedule: Schedule, schedule_data):
    """
    Update an existing task schedule.
    """
    task = schedule.task
    plan_start_date = schedule_data.get("plan_start_date")
    plan_end_date = schedule_data.get("plan_end_date")

    # Split the date range into time segments
    time_segments = split_date_range(plan_start_date, plan_end_date)

    if not time_segments:
        return  # No time segments, nothing to update

    # Pop the first time segment
    first_start_time, first_end_time = time_segments.pop(0)

    # Update the existing schedule with the first time segment
    schedule.plan_start_date = first_start_time
    schedule.plan_end_date = first_end_time
    schedule.save()

    # Create new schedules for remaining time segments
    for start_time, end_time in time_segments:
        TaskSchedule.objects.create(
            task=task,
            plan_start_date=start_time,
            plan_end_date=end_time,
        )


def delete_task_schedules(schedule_ids):
    """
    Delete task schedules based on the given schedule_ids.
    """
    TaskSchedule.objects.filter(id__in=schedule_ids).delete()


def create_todo_list_for_task(current_user: User, task: Task, todo_data):
    """
    Create a new todo list for the task.
    """
    todo_serializer = TodoListSerializer(data=todo_data)
    if todo_serializer.is_valid(raise_exception=True):
        todo_serializer.save(
            task=task,
            company=task.company,
            created_by=current_user,
        )


def update_todo_list_for_task(todo_list: TodoList, todo_data):
    """
    Update an existing todo list for the task.
    """
    todo_serializer = TodoListSerializer(instance=todo_list, data=todo_data)
    if todo_serializer.is_valid(raise_exception=True):
        todo_serializer.save()


def delete_todo_list_for_task(todo_list_ids):
    """
    Delete todo lists based on the given todo_list_ids.
    """
    TodoList.objects.filter(id__in=todo_list_ids).delete()


def calculate_new_time(start_time, delta_value, delta_unit):
    """
    Calculate new datetime from duration string
    """
    delta = None
    if delta_unit == DatetimeUnitTypes.HOURS.value:
        delta = timedelta(hours=delta_value)
    elif delta_unit == DatetimeUnitTypes.DAY.value:
        delta = timedelta(days=delta_value)
    elif delta_unit == DatetimeUnitTypes.WEEK.value:
        delta = timedelta(weeks=delta_value)

    # Calculate new time
    return start_time - delta
