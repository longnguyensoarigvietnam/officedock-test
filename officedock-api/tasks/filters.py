import django_filters
from django.db.models import Q
from django.utils.timezone import now

from .models import Task, TaskSchedule


class TaskCalendarFilter(django_filters.FilterSet):
    """
    Custom Task Calendar filter
    """

    start_date = django_filters.DateTimeFilter(method="filter_start_date")
    end_date = django_filters.DateTimeFilter(method="filter_end_date")
    user_id = django_filters.NumberFilter(
        field_name="people_in_charge__id", lookup_expr="exact"
    )

    class Meta:
        model = Task
        fields = ["start_date", "end_date", "user_id"]

    def filter_start_date(self, queryset, name, value):
        """
        Filter task start date
        """
        start_date = (
            value.date() if value.date() >= now().date() else now().date()
        )
        if value:
            queryset = queryset.filter(
                Q(task_schedules__plan_start_date__gte=start_date)
                | Q(task_schedules__plan_end_date__gte=start_date)
            ).distinct()
        return queryset

    def filter_end_date(self, queryset, name, value):
        """
        Filter task end date
        """
        if value:
            queryset = queryset.filter(
                Q(task_schedules__plan_start_date__lte=value)
                | Q(task_schedules__plan_end_date__lte=value)
            ).distinct()
        return queryset


class TaskScheduleFilter(django_filters.FilterSet):
    """
    Custom Task Calendar filter
    """

    start_date = django_filters.DateTimeFilter(method="filter_start_date")
    end_date = django_filters.DateTimeFilter(method="filter_end_date")
    user_id = django_filters.NumberFilter(
        field_name="task__people_in_charge__id", lookup_expr="exact"
    )

    class Meta:
        model = TaskSchedule
        fields = ["start_date", "end_date", "user_id"]

    def filter_start_date(self, queryset, name, value):
        """
        Filter task start date
        """
        if value:
            queryset = queryset.filter(
                Q(plan_start_date__gte=value) | Q(plan_end_date__gte=value)
            ).distinct()
        return queryset

    def filter_end_date(self, queryset, name, value):
        """
        Filter task end date
        """
        if value:
            queryset = queryset.filter(
                Q(plan_start_date__lte=value) | Q(plan_end_date__lte=value)
            ).distinct()
        return queryset


class TaskBoardFilter(django_filters.FilterSet):
    """
    Custom Task board filter
    """

    user_id = django_filters.NumberFilter(
        field_name="people_in_charge__id", lookup_expr="exact"
    )
    status_id = django_filters.NumberFilter(
        field_name="status__id", lookup_expr="exact"
    )
    organization_id = django_filters.NumberFilter(
        field_name="organization__id", lookup_expr="exact"
    )

    class Meta:
        model = Task
        fields = ["user_id", "status_id", "organization__id"]
