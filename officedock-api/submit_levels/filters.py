import django_filters

from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory


class SubmitLevelFilter(django_filters.FilterSet):
    """
    Custom Statistic Category filter
    """

    skill_name = django_filters.CharFilter(
        field_name="skill__name", lookup_expr="icontains"
    )
    status = django_filters.ChoiceFilter(
        field_name="status",
        lookup_expr="icontains",
        choices=SubmitLevelStatus.choices(),
    )

    class Meta:
        model = SubmitLevelHistory
        fields = ["skill_name", "status"]
