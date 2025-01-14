import django_filters
from companies.models import Company


class CompanyFilter(django_filters.FilterSet):
    """
    Custom company filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    status = django_filters.CharFilter(
        field_name="contract__status", lookup_expr="icontains"
    )
    start_date = django_filters.DateFilter(
        field_name="contract__start_date", lookup_expr="gte"
    )
    end_date = django_filters.DateFilter(
        field_name="contract__end_date", lookup_expr="lte"
    )

    class Meta:
        model = Company
        fields = ["id", "name", "status", "start_date", "end_date"]
