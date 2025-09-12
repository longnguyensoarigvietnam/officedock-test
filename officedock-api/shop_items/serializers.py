from rest_framework import serializers

from shop_items.models import ShopItems, UserItems


class ShopItemSerializer(serializers.ModelSerializer):
    """
    Serializer for shop items
    """

    is_owned = serializers.SerializerMethodField()

    class Meta:
        model = ShopItems
        fields = "__all__"
        extra_fields = ["is_owned"]

    def get_is_owned(self, obj):
        request = self.context.get("request")
        if request.user:
            return UserItems.objects.filter(
                user=request.user, item=obj
            ).exists()
        return False


class GroupedItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    item_type = serializers.CharField()
    items = ShopItemSerializer(many=True)


class UserItemSerializer(serializers.ModelSerializer):
    """
    Serializer for user items
    """

    class Meta:
        model = UserItems
        fields = ["item_type", "item", "is_equipped"]
