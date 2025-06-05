from django.db.models import Q

from calendars.models import Schedule, RepeatSchedule


def is_event_overlapping(instance, location, start_date, end_date):
    """
    Check if there are any events overlapping with the given time range at the specified location.
    """
    queryset = RepeatSchedule.objects.filter(
        Q(schedule__location=location)
        & Q(plan_start_date__lt=end_date)
        & Q(plan_end_date__gt=start_date)
    )

    if instance and isinstance(instance, Schedule):
        queryset = queryset.exclude(schedule=instance)

    return queryset.exists()
