from rest_framework import serializers
from users.models import User
from users.serializers import BaseUserSerializer, UsersForCreationSerializer
from .models import PeopleInChargeTags, Tag


class BaseTagSerializer(serializers.ModelSerializer):
    """
    Serializer for Base Tag
    """

    class Meta:
        model = Tag
        fields = ["id", "name"]


class TagSerializer(serializers.ModelSerializer):
    """
    Serializer for Tag
    """

    responsible_person = BaseUserSerializer(read_only=True)
    responsible_person_id = serializers.PrimaryKeyRelatedField(
        source="responsible_person",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    people_in_charge = BaseUserSerializer(many=True, read_only=True)
    people_in_charge_ids = UsersForCreationSerializer(
        many=True, write_only=True
    )

    class Meta:
        model = Tag
        fields = [
            "id",
            "name",
            "responsible_person",
            "responsible_person_id",
            "people_in_charge",
            "people_in_charge_ids",
        ]

    def to_representation(self, instance):
        """
        Custom sorting by index for list people in charge
        """
        representation = super().to_representation(instance)
        sorted_users = [
            item.user
            for item in PeopleInChargeTags.objects.filter(
                tag=instance
            ).order_by("id")
        ]
        representation["people_in_charge"] = BaseUserSerializer(
            sorted_users, many=True
        ).data
        return representation


class TagsForCreationSerializer(serializers.Serializer):
    """
    Serializer for create a user form.
    """

    tag = BaseTagSerializer(many=True, read_only=True)
    tag_id = serializers.PrimaryKeyRelatedField(
        source="tag",
        queryset=Tag.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
