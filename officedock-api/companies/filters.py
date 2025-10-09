from django.db.models import Count
import django_filters
from companies.models import Company


class CompanyFilter(django_filters.FilterSet):
    """
    Custom company filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    start_date = django_filters.CharFilter(method="filter_start_date")
    end_date = django_filters.DateFilter(
        field_name="contract__end_date", lookup_expr="exact"
    )
    next_renewal_at = django_filters.CharFilter(method="filter_next_renewal")

    contract_created_at = django_filters.DateFilter(
        field_name="contract__created_at", lookup_expr="date"
    )
    plan = django_filters.CharFilter(
        field_name="company_plan__plan__name", lookup_expr="exact"
    )
    user_amount = django_filters.NumberFilter(method="filter_amount_user")

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "status",
            "start_date",
            "end_date",
            "next_renewal_at",
            "contract_created_at",
            "plan",
            "user_amount",
        ]

    def filter_amount_user(self, queryset, name, value):
        """
        Filter amount user
        """
        if value:
            queryset = queryset.annotate(total_user=Count("users")).filter(
                total_user=value
            )
        return queryset

    def filter_next_renewal(self, queryset, name, value):
        """
        Filter by format 'YYYY-MM'
        """
        try:
            year, month = value.split("-")
            return queryset.filter(
                contract__next_renewal_at__year=int(year),
                contract__next_renewal_at__month=int(month),
            )
        except ValueError:
            return queryset

    def filter_start_date(self, queryset, name, value):
        """
        Filter by format 'YYYY-MM'
        """
        try:
            year, month = value.split("-")
            return queryset.filter(
                contract__start_date__year=int(year),
                contract__start_date__month=int(month),
            )
        except ValueError:
            return queryset
