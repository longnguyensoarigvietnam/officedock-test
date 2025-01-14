import django_filters
from django.db.models import Q

from terms.constants import TermTypes, TermStatus
from terms.models import Term


class TermFilter(django_filters.FilterSet):
    """
    Term filter
    """

    status = django_filters.ChoiceFilter(
        field_name="status",
        lookup_expr="icontains",
        choices=TermStatus.choices(),
    )
    title = django_filters.CharFilter(
        field_name="title", lookup_expr="icontains"
    )
    period_start = django_filters.DateFilter(
        field_name="period_start",
        lookup_expr="icontains",
        method="filter_period",
    )
    period_end = django_filters.DateFilter(
        field_name="period_end",
        lookup_expr="icontains",
        method="filter_period",
    )
    type = django_filters.ChoiceFilter(
        field_name="type", lookup_expr="icontains", choices=TermTypes.choices()
    )

    class Meta:
        model = Term
        fields = ["status", "period_start", "period_end", "title", "type"]

    def filter_period_start(self, queryset, name, value):
        """
        Filter period start
        """
        if value:
            queryset = queryset.filter(
                Q(period_start__gte=value) | Q(period_end=value)
            )
        return queryset

    def filter_period_end(self, queryset, name, value):
        """
        Filter period end
        """
        if value:
            queryset = queryset.filter(
                Q(period_start__lte=value) | Q(period_end__isnull=True)
            )
        return queryset

    def filter_period(self, queryset, name, value):
        """
        Filter period
        """
        period_start = self.data.get("period_start")
        period_end = self.data.get("period_end")

        if period_end is None:
            queryset = queryset.filter(
                Q(period_start__gte=period_start)
                & Q(
                    Q(period_end__gte=period_start) | Q(period_end__isnull=True)
                )
            )
        elif period_start is None:
            queryset = queryset.filter(
                Q(period_start__lte=period_end) & Q(period_end__lte=period_end)
            )
        elif period_start and period_end:
            queryset = queryset.filter(
                period_start__gte=period_start, period_end__lte=period_end
            )

        return queryset
