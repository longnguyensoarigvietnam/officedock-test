import django_filters

from users.models import User


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

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "role_id",
            "company_name",
            "organization_id",
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
