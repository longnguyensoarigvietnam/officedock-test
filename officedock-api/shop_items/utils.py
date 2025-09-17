from typing import Iterable

from shop_items.constants import ItemDefaultEnums
from shop_items.models import ShopItems, UserItems


def assign_default_items_to_user(user) -> None:
    """
    Assign default wear items to a newly created user.
    Idempotent: uses get_or_create so it can be safely re-run.
    """
    # Collect default keys from constants (hat/clothes/shoes)
    default_keys: list[str] = []
    for group in (
        ItemDefaultEnums.HAT.value,
        ItemDefaultEnums.CLOTHES.value,
        ItemDefaultEnums.SHOES.value,
    ):
        default_keys.extend(
            [item["key"] for item in group if item.get("default")]
        )

    if not default_keys:
        return

    items: Iterable[ShopItems] = ShopItems.objects.filter(key__in=default_keys)

    for item in items:
        UserItems.objects.get_or_create(
            company=user.company,
            user=user,
            item=item,
            item_type=item.item_type,
            defaults={"is_equipped": True},
        )
