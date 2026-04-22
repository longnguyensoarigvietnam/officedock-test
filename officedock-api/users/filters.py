import django_filters

from users.models import User
from common.utils import common_filter_is_deleted


class SystemUserFilter(django_filters.FilterSet):
    full_name = django_filters.CharFilter(
        field_name="profile__full_name", lookup_expr="icontains"
    )
    email = django_filters.CharFilter(
        field_name="email", lookup_expr="icontains"
    )
    role_id = django_filters.CharFilter(
        field_name="roles__id", lookup_expr="exact"
    )
    company_name = django_filters.CharFilter(
        field_name="company__name", lookup_expr="icontains"
    )
    organization_id = django_filters.CharFilter(
        field_name="organizations__id", lookup_expr="exact"
    )
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
        model = User
        fields = [
            "full_name",
            "email",
            "role_id",
            "company_name",
            "organization_id",
            "is_deleted",
        ]


class AdminUserFilter(django_filters.FilterSet):
    full_name = django_filters.CharFilter(
        field_name="profile__full_name", lookup_expr="icontains"
    )
    email = django_filters.CharFilter(
        field_name="email", lookup_expr="icontains"
    )

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
        ]
