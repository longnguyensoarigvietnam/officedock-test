from collections import defaultdict
from django.db import transaction
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from base.apis import BaseAPIViewSet
from base.paginations import CustomCursorPagination
from shop_items.filters import ShopItemFilter
from shop_items.models import ShopItems, UserItems
from shop_items.serializers import GroupedItemSerializer, UserItemSerializer
from users.constants import CurrencyEnums
from base.messages import ERROR_MESSAGES


@extend_schema(tags=["System > Shop Items"])
class ShopItemViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for shop items
    """

    permission_classes = [IsAuthenticated]
    queryset = ShopItems.objects.all()
    serializer_class = GroupedItemSerializer
    filterset_class = ShopItemFilter
    pagination_class = CustomCursorPagination

    @extend_schema(parameters=[OpenApiParameter("ordering", type=str)])
    def list(self, request, *args, **kwargs):
        # Distinct groups (name + item_type)
        distinct_groups = (
            self.filter_queryset(self.get_queryset())
            .order_by("name")
            .values("name", "item_type")
            .distinct()
        )

        # Paginate
        page = self.paginate_queryset(distinct_groups)
        if page is None:
            selected_groups = distinct_groups
        else:
            selected_groups = page

        selected_names = [row["name"] for row in selected_groups]
        selected_types = [row["item_type"] for row in selected_groups]

        items = (
            self.get_queryset()
            .filter(name__in=selected_names, item_type__in=selected_types)
            .order_by("name")
        )

        grouped = defaultdict(list)
        for item in items:
            grouped[(item.name, item.item_type)].append(item)

        grouped_data = [
            {"name": name, "item_type": item_type, "items": group_items}
            for (name, item_type), group_items in grouped.items()
        ]

        serializer = GroupedItemSerializer(
            grouped_data, many=True, context={"request": request}
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return self.get_paginated_response(serializer.data)


@extend_schema(tags=["System > Users"])
class UserItemViewSet(BaseAPIViewSet):
    """
    API endpoint for shop items
    """

    permission_classes = [IsAuthenticated]

    @action(
        methods=["POST"],
        detail=False,
        url_path="buy-item",
        serializer_class=UserItemSerializer,
    )
    @transaction.atomic()
    def handle_store_item_by_user(self, request):
        """
        Create a new item for the given user.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        item = serializer_data.get("item")
        user = serializer_data.get("user")
        user_wallet = (
            user.coin
            if item.type_price == CurrencyEnums.COIN.value
            else user.pearl
        )
        if user_wallet < item.price:
            raise ValidationError({"detail": ERROR_MESSAGES["cannot_buy_item"]})
        serializer_data["company"] = user.company
        # Clean wearing of character
        UserItems.objects.filter(
            item_type=serializer_data["item_type"], user=user, is_weared=True
        ).update(is_weared=False)
        user_item = user.items.create(**serializer_data)

        return self.response_created(UserItemSerializer(user_item).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("item_type", type=str),
            OpenApiParameter("page_size", type=str),
            OpenApiParameter(
                "ordering",
                type=str,
                description="Filter items by type. Default value is 'item__name'",
            ),
        ]
    )
    @action(
        methods=["GET"],
        detail=True,
        url_path="items",
        pagination_class=CustomCursorPagination,
    )
    def get_user_items(self, request, pk):
        """
        Get list item by user
        """
        user = self.get_object()
        queryset = user.items.select_related("item").all()
        # Optional filter by item_type from query params
        item_type = request.query_params.get("item_type")
        if item_type:
            queryset = queryset.filter(item_type=item_type)

        # Extract distinct (name, item_type) pairs for pagination
        distinct_groups = (
            queryset.values("item__name", "item_type")
            .distinct()
            .order_by("item__name", "item_type")
        )

        # Apply pagination on distinct groups
        page = self.paginate_queryset(distinct_groups)
        if page is None:
            selected_groups = distinct_groups
        else:
            selected_groups = page
        # Build a list of (name, item_type) pairs from the selected groups
        selected_pairs = [
            (g["item__name"], g["item_type"]) for g in selected_groups
        ]

        # Fetch all UserItems that belong to the selected (name, item_type) groups
        items = queryset.filter(
            item__name__in=[name for name, _ in selected_pairs],
            item_type__in=[itype for _, itype in selected_pairs],
        ).order_by("item__name", "item_type", "id")

        # Group items by (name, item_type)
        grouped = defaultdict(list)
        for user_item in items:
            # Append the related ShopItem (not UserItem) so it matches GroupedItemSerializer
            grouped[(user_item.item.name, user_item.item_type)].append(
                user_item.item
            )

        # Transform grouped dict into a list of objects compatible with GroupedItemSerializer
        grouped_data = [
            {"name": name, "item_type": item_type, "items": group_items}
            for (name, item_type), group_items in grouped.items()
        ]

        serializer = GroupedItemSerializer(
            grouped_data, many=True, context={"request": request}
        )
        return self.get_paginated_response(serializer.data)
