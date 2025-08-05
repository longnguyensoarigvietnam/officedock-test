from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from base.apis import BaseAPIViewSet
from thanks_messages.constants import ThanksMessageTypes
from thanks_messages.models import ThanksMessage
from thanks_messages.serializers import (
    ReadThanksMessageSerializer,
    ThanksMessageSerializer,
)


@extend_schema(tags=["System > Thanks Messages"])
class ThanksMessageViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for Thanks Messages
    """

    queryset = ThanksMessage.objects.order_by("-created_at")
    serializer_class = ThanksMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtering by company
        """
        company_id = self.request.user.company_id
        return super().get_queryset().filter(company_id=company_id)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "type", type=str, enum=ThanksMessageTypes.values()
            ),
            OpenApiParameter("is_read", type=bool, required=False),
            OpenApiParameter("user_id", type=int, required=False),
            OpenApiParameter("is_show_deleted", type=bool, required=False),
        ]
    )
    def list(self, request, *args, **kwargs):
        current_user = request.user
        type = request.query_params.get("type")
        is_read_str = request.query_params.get("is_read")
        user_id = request.query_params.get("user_id", current_user.id)
        queryset = self.get_queryset()

        if type:
            if type == ThanksMessageTypes.RECEIVED.value:
                queryset = queryset.filter(recipient_id=user_id)
            elif type == ThanksMessageTypes.SENT.value:
                queryset = queryset.filter(sender_id=user_id)

        if is_read_str:
            is_read = is_read_str.lower() == "true"
            if is_read:
                queryset = queryset.filter(read_at__isnull=False)
            else:
                queryset = queryset.filter(read_at__isnull=True)

        return self.response_pagination(request, queryset, self.get_serializer)

    def perform_create(self, serializer):
        # TODO: Handle adding coins for the sender and the receiver
        return super().perform_create(serializer)

    @action(methods=["GET"], detail=False, url_path="remaining-quota")
    def remaining_quota(self, request):
        """
        Get remaining quota thanks messages of user
        """
        return self.response_ok(
            {
                "remaining_quota": ThanksMessage.objects.remaining_quota(
                    request.user
                )
            }
        )

    @action(
        methods=["POST"],
        detail=False,
        url_path="read",
        serializer_class=ReadThanksMessageSerializer,
    )
    def read(self, request):
        """
        Read thanks messages of user
        """
        serializer = self.get_serializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        tks_msgs = validated_data.pop("thanks_messages", [])

        items_to_update = []
        for item in tks_msgs:
            item.read_at = now()
            items_to_update.append(item)

        ThanksMessage.objects.bulk_update(items_to_update, ["read_at"])

        return self.response_ok(
            {
                "remaining_quota": ThanksMessage.objects.remaining_quota(
                    request.user
                )
            }
        )

    def perform_destroy(self, instance):
        """Override delete"""
        instance.soft_delete()
