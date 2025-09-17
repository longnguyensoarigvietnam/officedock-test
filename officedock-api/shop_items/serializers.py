from rest_framework import serializers

from shop_items.models import ShopItems, UserItems
from common.utils import get_signed_url
from common.constants import AVATAR_GCS_EXPIRATION_SECONDS


class ShopItemSerializer(serializers.ModelSerializer):
    """
    Serializer for shop items
    """

    is_owned = serializers.SerializerMethodField(read_only=True)
    is_equipped = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ShopItems
        fields = "__all__"
        extra_fields = ["is_owned", "is_equipped"]

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.crop_file:
            representation["crop_file"] = get_signed_url(
                instance.crop_file, AVATAR_GCS_EXPIRATION_SECONDS
            )

        if instance.full_file:
            representation["full_file"] = get_signed_url(
                instance.full_file, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation

    def get_is_owned(self, obj):
        user_owned_items = self.context.get("user_owned_items")
        if user_owned_items is not None:
            return obj.id in user_owned_items
        return False

    def get_is_equipped(self, obj):
        user_equipped_items = self.context.get("user_equipped_items")
        if user_equipped_items is not None:
            return obj.id in user_equipped_items
        return False


class GroupedItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    item_type = serializers.CharField()
    items = ShopItemSerializer(many=True)
    is_all_owned = serializers.SerializerMethodField(read_only=True)

    def get_is_all_owned(self, obj):
        """
        Check if all items in the group are owned by the user
        """
        user_owned_items = self.context.get("user_owned_items")
        if user_owned_items is None or not obj.get("items"):
            return False

        # Check if all items in the group are owned
        for item in obj["items"]:
            if item.id not in user_owned_items:
                return False
        return True


class UserItemSerializer(serializers.ModelSerializer):
    """
    Serializer for user items
    """

    class Meta:
        model = UserItems
        fields = ["item_type", "item", "is_equipped"]
