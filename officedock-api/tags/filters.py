import django_filters
from tags.models import Tag


class TagFilter(django_filters.FilterSet):
    """
    Custom Tag filter
    """

    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Tag
        fields = ["name"]
