import django_filters
from users.models import Role


class RoleFilter(django_filters.FilterSet):
    """
    Filter roles by name
    """

    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Role
        fields = [
            "name",
        ]
