import django_filters
from django.db.models import Q

from calendars.constants import CalendarTypes
from tasks.models import TaskDuration


class ActualDurationFilter(django_filters.FilterSet):
    """
    Custom Organization filter
    """

    type = django_filters.ChoiceFilter(
        method="get_type", choices=CalendarTypes.choices()
    )
    title = django_filters.CharFilter(method="get_title")
    tag_id = django_filters.NumberFilter(method="get_tag")
    staff_id = django_filters.NumberFilter(method="get_staff")
    large_category = django_filters.CharFilter(method="get_large_category")
    medium_category = django_filters.CharFilter(method="get_medium_category")
    small_category = django_filters.CharFilter(method="get_small_category")

    class Meta:
        model = TaskDuration
        fields = [
            "type",
            "title",
            "tag_id",
            "staff_id",
            "large_category",
            "medium_category",
            "small_category",
        ]

    def get_type(self, queryset, name, value):
        """Return filter type of model in duration"""
        if value == CalendarTypes.TASK.value:
            return queryset.filter(task__isnull=False, schedule__isnull=True)
        elif value == CalendarTypes.SCHEDULE.value:
            return queryset.filter(task__isnull=True, schedule__isnull=False)

    def get_title(self, queryset, name, value):
        """Return filter title of model duration"""
        return queryset.filter(
            Q(task__title__icontains=value)
            | Q(schedule__title__icontains=value)
        )

    def get_tag(self, queryset, name, value):
        """Return filter tag of model duration"""
        return queryset.filter(
            Q(task__tags__id=value) | Q(schedule__tags__id=value)
        )

    def get_staff(self, queryset, name, value):
        """Return filter staff of model duration"""
        return queryset.filter(
            Q(task__people_in_charge__id=value)
            | Q(schedule__participants__id=value)
        )

    def get_large_category(self, queryset, name, value):
        """Return filter large category of model duration"""
        if value == "null":
            return queryset.filter(
                Q(task__categories__large_statistic_category__isnull=True)
                & Q(schedule__categories__large_statistic_category__isnull=True)
            )
        return queryset.filter(
            Q(
                task__categories__large_statistic_category__name__icontains=value,
            )
            | Q(
                schedule__categories__large_statistic_category__name__icontains=value,
            )
        )

    def get_medium_category(self, queryset, name, value):
        """Return filter medium category of model duration"""
        if value == "null":
            return queryset.filter(
                Q(task__categories__medium_statistic_category__isnull=True)
                & Q(
                    schedule__categories__medium_statistic_category__isnull=True
                )
            )
        return queryset.filter(
            Q(
                task__categories__medium_statistic_category__name__icontains=value,
            )
            | Q(
                schedule__categories__medium_statistic_category__name__icontains=value,
            )
        )

    def get_small_category(self, queryset, name, value):
        """Return filter small category of model duration"""
        if value == "null":
            return queryset.filter(
                Q(task__categories__small_statistic_category__isnull=True)
                & Q(schedule__categories__small_statistic_category__isnull=True)
            )
        return queryset.filter(
            Q(
                task__categories__small_statistic_category__name__icontains=value,
            )
            | Q(
                schedule__categories__small_statistic_category__name__icontains=value,
            )
        )
