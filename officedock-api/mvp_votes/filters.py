import django_filters

from mvp_votes.models import MVPVote


class MVPVoteFilter(django_filters.FilterSet):
    """
    Custom filterset for MVPVote
    """

    mvp_candidate = django_filters.NumberFilter(lookup_expr="exact")

    class Meta:
        model = MVPVote
        fields = ["mvp_candidate"]
