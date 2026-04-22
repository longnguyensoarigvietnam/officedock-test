import django_filters
from django.db.models import Q
from tags.models import Tag


class TagFilter(django_filters.FilterSet):
    """
    Custom Tag filter - search by name or furigana
    """

    name = django_filters.CharFilter(
        method="filter_name_or_furigana", field_name="name"
    )

    class Meta:
        model = Tag
        fields = ["name"]

    def filter_name_or_furigana(self, queryset, name, value):
        """
        Filter tags by name or furigana (case-insensitive)
        """
        if value:
            queryset = queryset.filter(
                Q(name__icontains=value) | Q(furigana__icontains=value)
            )
        return queryset
