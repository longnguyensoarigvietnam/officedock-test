import django_filters
from organizations.models import Organization


class OrganizationFilter(django_filters.FilterSet):
    """
    Custom Organization filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    has_statistic_categories = django_filters.BooleanFilter(
        method="get_statistic_categories"
    )
    superior_name = django_filters.CharFilter(
        field_name="superior__name", lookup_expr="icontains"
    )

    class Meta:
        model = Organization
        fields = ["id", "name", "superior_name", "has_statistic_categories"]

    def get_statistic_categories(self, queryset, name, value):
        """
        Get organization have statistic categories
        """
        if value:
            return (
                queryset.filter(
                    organizations_statistic_categories__isnull=False
                )
                .distinct()
                .order_by("id")
            )

        return queryset
