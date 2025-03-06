import django_filters
from tags.models import Tag


class TagFilter(django_filters.FilterSet):
    """
    Custom Tag filter
    """

    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    responsible_person = django_filters.CharFilter(
        field_name="responsible_person__profile__full_name",
        lookup_expr="icontains",
    )
    people_in_charge = django_filters.CharFilter(
        field_name="people_in_charge__profile__full_name",
        lookup_expr="icontains",
    )

    class Meta:
        model = Tag
        fields = ["name", "responsible_person", "people_in_charge"]
