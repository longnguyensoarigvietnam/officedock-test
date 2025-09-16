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
        user = self.context.get("user")
        if user:
            return UserItems.objects.filter(user=user, item=obj).exists()
        return False

    def get_is_equipped(self, obj):
        user = self.context.get("user")
        if user:
            user_item = UserItems.objects.filter(user=user, item=obj).first()
            return user_item.is_equipped if user_item else False
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
