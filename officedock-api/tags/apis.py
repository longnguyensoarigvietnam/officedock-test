from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from base.apis import BaseAPIViewSet
from base.permissions import ActionPermission

from roles.constants import Screens
from .models import Tag
from .serializers import TagSerializer
from .filters import TagFilter


@extend_schema(tags=["System > Tag"])
class TagViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Tag
    """

    queryset = Tag.objects.order_by("created_at").all()
    serializer_class = TagSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
    ]
    filterset_class = TagFilter
    screen_name = Screens.TAG.value

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        company = user.company
        queryset = super().get_queryset().filter(company=company)

        return queryset

    def get_serializer_context(self):
        """
        Add request to context
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Custom logic for creating a new Tag instance.
        """
        serializer_data = serializer.validated_data
        organizations = serializer_data.pop("organizations")

        company = self.request.user.company
        tag = serializer.save(company=company)

        for organization in organizations:
            tag.organizations.add(
                organization, through_defaults={"company": company}
            )

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Custom logic for updating an existing tag instance.
        """

        # Pop people_in_charge_ids from validated data
        serializer_data = serializer.validated_data
        organizations = serializer_data.pop("organizations", None)

        # Update the tag instance
        tag = serializer.save()

        if organizations:
            tag.organizations.clear()
            for organization in organizations:
                tag.organizations.add(
                    organization, through_defaults={"company": tag.company}
                )

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("is_hidden", type=bool),
        ]
    )
    def list(self, request):
        """
        Return list of tag
        """
        queryset = self.filter_queryset(self.get_queryset())

        if request.query_params.get("is_hidden") == "true":
            queryset = queryset.filter(is_hidden=True)
        else:
            queryset = queryset.filter(is_hidden=False)

        organization_ids = request.query_params.get("organization_ids")
        if organization_ids:
            ids = []
            for id in organization_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                queryset = queryset.filter(organizations__id__in=ids)

        return self.response_pagination(
            request, queryset.distinct(), TagSerializer
        )
