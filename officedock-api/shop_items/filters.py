import django_filters
from shop_items.models import ShopItems


class ShopItemFilter(django_filters.FilterSet):
    """
    Custom filterset for MVPVote
    """

    item_type = django_filters.CharFilter(lookup_expr="exact")

    class Meta:
        model = ShopItems
        fields = ["item_type"]
