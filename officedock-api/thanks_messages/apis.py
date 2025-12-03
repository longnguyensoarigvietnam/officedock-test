from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from base.apis import BaseAPIViewSet
from base.paginations import CustomCursorPagination
from base.filters import FilterByPermission
from base.permissions import ActionPermission
from roles.constants import Screens

from organizations.models import Organization
from organizations.serializers import OrganizationMemberSerializer
from organizations.constants import OrganizationTypes

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
):
    """
    API endpoint for Thanks Messages
    """

    queryset = ThanksMessage.objects.order_by("-created_at")
    serializer_class = ThanksMessageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomCursorPagination
    ordering = "-created_at"

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
            OpenApiParameter("is_pagination", type=bool, required=False),
        ]
    )
    def list(self, request, *args, **kwargs):
        current_user = request.user
        type = request.query_params.get("type")
        is_read_str = request.query_params.get("is_read")
        is_pagination_str = request.query_params.get("is_pagination")
        queryset = self.get_queryset()

        if type:
            if type == ThanksMessageTypes.RECEIVED.value:
                queryset = queryset.filter(recipient_id=current_user.id)
            elif type == ThanksMessageTypes.SENT.value:
                queryset = queryset.filter(sender_id=current_user.id)

        if is_read_str:
            is_read = is_read_str.lower() == "true"
            if is_read:
                queryset = queryset.filter(read_at__isnull=False)
            else:
                queryset = queryset.filter(read_at__isnull=True)

        # Return list thanks messages unread for user
        if is_pagination_str and is_pagination_str.lower() == "false":
            return self.response_ok(
                self.get_serializer(
                    queryset.filter(deleted_at__isnull=True).order_by(
                        "created_at"
                    ),
                    many=True,
                    context={
                        "request": request,
                        "is_show_deleted_message": False,
                    },
                ).data
            )

        return self.response_pagination(
            request,
            queryset,
            self.get_serializer,
            CustomCursorPagination,
            extra_context={"is_show_deleted_message": False},
        )

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
        read_all = validated_data.pop("read_all", False)

        if read_all and not tks_msgs:
            tks_msgs = ThanksMessage.objects.unread_for(request.user)

        items_to_update = []
        time_now = now()
        for item in tks_msgs:
            item.read_at = time_now
            items_to_update.append(item)

        ThanksMessage.objects.bulk_update(items_to_update, ["read_at"])

        return self.response_ok(
            {"unread_count": ThanksMessage.objects.unread_count(request.user)}
        )


@extend_schema(tags=["System > Thanks Messages management"])
class ThanksMessageManagementViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for Thanks Messages Management
    """

    queryset = ThanksMessage.objects.order_by("-created_at")
    serializer_class = ThanksMessageSerializer
    permission_classes = [ActionPermission]
    pagination_class = CustomCursorPagination
    filter_backends = [FilterByPermission]
    screen_name = Screens.THANKS_MESSAGE_MANAGEMENT.value
    ordering = "-created_at"

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
        ]
    )
    def list(self, request, *args, **kwargs):
        current_user = request.user
        type = request.query_params.get("type")
        is_read_str = request.query_params.get("is_read")
        user_id = request.query_params.get("user_id", current_user.id)
        queryset = self.filter_queryset(self.get_queryset())

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

        return self.response_pagination(
            request,
            queryset,
            self.get_serializer,
            CustomCursorPagination,
            extra_context={"is_show_deleted_message": True},
        )

    def perform_destroy(self, instance):
        """Override delete"""
        instance.soft_delete()

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("search", type=str),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="members",
        serializer_class=OrganizationMemberSerializer,
    )
    def thanks_msg_members(self, request):
        """
        Get list of member in organization
        """
        queryset = (
            Organization.objects.filter(
                company_id=request.user.company_id, deleted_at__isnull=True
            )
            .exclude(type=OrganizationTypes.CALENDAR.value)
            .order_by("-created_at")
        )
        queryset = self.filter_queryset(queryset)
        full_orgs = queryset.values("id", "name")
        search = request.query_params.get("search")
        organization_id = request.query_params.get("organization_id")

        if search:
            queryset = queryset.filter(
                users__profile__full_name__icontains=search
            )

        if organization_id:
            queryset = queryset.filter(id=organization_id)

        return self.response_ok(
            {
                "full_organizations": full_orgs,
                "results": self.get_serializer(
                    queryset.distinct(), many=True, context={"search": search}
                ).data,
            }
        )
