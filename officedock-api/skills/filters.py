import django_filters
from skills.models import StatisticCategory, SkillMap, Skill


class StatisticCategoryFilter(django_filters.FilterSet):
    """
    Custom Statistic Category filter
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = StatisticCategory
        fields = ["id", "name"]


class SkillMapFilter(django_filters.FilterSet):
    """
    Custom Skill Map filter
    """

    organization_name = django_filters.CharFilter(
        field_name="organization__name", lookup_expr="icontains"
    )
    staff_id = django_filters.CharFilter(
        field_name="staff__id", lookup_expr="exact"
    )

    class Meta:
        model = SkillMap
        fields = ["organization_name", "staff_id"]


class SkillFilter(django_filters.FilterSet):
    """
    Custom Statistic Skill
    """

    id = django_filters.NumberFilter(field_name="id", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Skill
        fields = ["id", "name"]
