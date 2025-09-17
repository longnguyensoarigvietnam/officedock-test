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
    start_date = django_filters.DateFilter(
        field_name="contract__start_date", lookup_expr="gte"
    )
    end_date = django_filters.DateFilter(
        field_name="contract__end_date", lookup_expr="lte"
    )
    next_renewal_at = django_filters.DateFilter(
        field_name="contract__next_renewal_at", lookup_expr="lte"
    )
    contract_created_at = django_filters.DateFilter(
        field_name="contract__created_at", lookup_expr="lte"
    )
    plan = django_filters.CharFilter(
        field_name="plan__plan__name", lookup_expr="exact"
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
