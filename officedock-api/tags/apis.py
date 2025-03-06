from drf_spectacular.utils import extend_schema
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
        return super().get_queryset().filter(company=company)

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Custom logic for creating a new Tag instance.
        """
        serializer_data = serializer.validated_data
        people_in_charge_data = serializer_data.pop("people_in_charge_ids")

        company = self.request.user.company
        tag = serializer.save(company=company)

        for item in people_in_charge_data:
            tag.people_in_charge.add(
                item["people_in_charge"], through_defaults={"company": company}
            )

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Custom logic for updating an existing tag instance.
        """

        # Pop people_in_charge_ids from validated data
        serializer_data = serializer.validated_data
        people_in_charge_data = serializer_data.pop("people_in_charge_ids")

        # Update the tag instance
        tag = serializer.save()
        people_in_charge_ids = []
        tag.people_in_charge.clear()
        for item in people_in_charge_data:
            # Update the people_in_charge relationship for the tag
            tag.people_in_charge.add(
                item["people_in_charge"],
                through_defaults={"company": self.request.user.company},
            )
            people_in_charge_ids.append(item["people_in_charge"].id)

        # Update to remove people in charge of task if it has removed in tag
        for task in tag.tasks.all():
            for people_in_charge in task.people_in_charge.all():
                if people_in_charge.id not in people_in_charge_ids:
                    task.people_in_charge.remove(people_in_charge)
