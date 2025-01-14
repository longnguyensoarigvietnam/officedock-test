import django_filters

from tasks.models import TaskSchedule


class TaskScheduleForCalendarFilter(django_filters.FilterSet):
    start_date = django_filters.DateTimeFilter(
        field_name="plan_start_date", lookup_expr="gte"
    )
    end_date = django_filters.DateTimeFilter(
        field_name="plan_end_date", lookup_expr="lte"
    )
    user_id = django_filters.NumberFilter(
        field_name="task__people_in_charge__id", lookup_expr="exact"
    )

    class Meta:
        model = TaskSchedule
        fields = ["start_date", "end_date", "user_id"]
