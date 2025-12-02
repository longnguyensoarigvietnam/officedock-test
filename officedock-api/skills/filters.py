import django_filters

from skills.models import StatisticCategory
from common.utils import common_filter_is_deleted


class StatisticCategoryFilter(django_filters.FilterSet):
    """
    Custom Statistic Category filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    is_deleted = django_filters.BooleanFilter(method="filter_is_deleted")

    def filter_is_deleted(self, queryset, name, value):
        """
        Filter users by deletion status.

        - True: return users where `deleted_at` is less than or equal to now
        - False: return users where `deleted_at` is in the future or is null (active)
        - None: no filtering applied

        Args:
            queryset: The initial queryset of users
            name: The filter field name (unused)
            value: Boolean or None indicating desired deletion status

        Returns:
            A filtered queryset reflecting the requested deletion status
        """
        return common_filter_is_deleted(queryset, value)

    class Meta:
        model = StatisticCategory
        fields = ["id", "name", "is_deleted"]
