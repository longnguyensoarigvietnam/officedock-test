from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from common.serializers import CreationDataUserWithMainOrganizationSerializer
from users.models import User
from thanks_messages.models import ThanksMessage


class ThanksMessageSerializer(serializers.ModelSerializer):
    """
    Serialzier for thanks message
    """

    recipient_id = serializers.PrimaryKeyRelatedField(
        source="recipient",
        queryset=User.objects.all(),
        required=True,
        write_only=True,
    )

    sender = CreationDataUserWithMainOrganizationSerializer(read_only=True)
    recipient = CreationDataUserWithMainOrganizationSerializer(read_only=True)

    class Meta:
        model = ThanksMessage
        fields = [
            "id",
            "sender",
            "recipient",
            "recipient_id",
            "message",
            "read_at",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
        read_only_fields = [
            "id",
            "read_at",
            "created_at",
            "updated_at",
            "deleted_at",
        ]

    def validate(self, attrs):
        sender = self.context.get("request").user
        recipient = attrs.get("recipient")

        if ThanksMessage.objects.remaining_quota(sender) <= 0:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["quota_exceeded"]}
            )

        if sender.company_id != recipient.company_id:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["company_not_match"]}
            )

        if sender.id == recipient.id:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["cannot_send_yourself"]}
            )

        attrs["sender"] = sender
        return super().validate(attrs)

    def to_representation(self, instance):
        is_show_deleted_message = self.context.get(
            "is_show_deleted_message", False
        )
        representation = super().to_representation(instance)

        if not is_show_deleted_message and instance.deleted_at:
            representation["message"] = None

        return representation


class CompanyThanksMessagePKField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return ThanksMessage.objects.filter(
                company_id=request.user.company_id, recipient=request.user
            )
        return ThanksMessage.objects.none()


class ReadThanksMessageSerializer(serializers.ModelSerializer):
    """
    Serialzier for read thanks message
    """

    read_all = serializers.BooleanField(
        default=False, required=False, allow_null=True, write_only=True
    )
    ids = CompanyThanksMessagePKField(
        source="thanks_messages",
        many=True,
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = ThanksMessage
        fields = ["ids", "read_all"]
