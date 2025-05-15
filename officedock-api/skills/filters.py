import django_filters

from skills.models import StatisticCategory


class StatisticCategoryFilter(django_filters.FilterSet):
    """
    Custom Statistic Category filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = StatisticCategory
        fields = ["id", "name"]
