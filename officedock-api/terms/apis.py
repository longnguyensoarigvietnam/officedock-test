from http import HTTPStatus

from django.db import transaction
from django.db.models import Q
from django.template.defaultfilters import lower
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES, KEYWORDS
from base.permissions import IsOperationAdminOnly
from terms.constants import TermStatus, TermTypes
from terms.filters import TermFilter
from terms.models import Term
from terms.serializers import TermSerializer
from users.constants import RoleTypes


@extend_schema(tags=["Admin > Term"])
class AdminTermViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint that allows term to be viewed or edited.
    """

    serializer_class = TermSerializer
    queryset = Term.objects.all()
    permission_classes = [IsOperationAdminOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = TermFilter

    def get_queryset(self):
        """
        Allow the task in the logged in user's company
        """
        return super().get_queryset().order_by("created_at")

    def destroy(self, request, *args, **kwargs):
        """
        Handle delete operation
        """
        instance = self.get_object()
        if (
            instance.status == TermStatus.PUBLIC.value
            and instance.read_terms.exists()
        ):
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["cannot_delete_type"].format(
                        type=KEYWORDS[lower(instance.type)]
                    )
                }
            )

        self.perform_destroy(instance)

        return self.response(status_code=HTTPStatus.NO_CONTENT)


@extend_schema(tags=["System > Term"])
class SystemTermViewSet(BaseAPIViewSet):
    """
    API endpoint that allows system to be viewed.
    """

    queryset = Term.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]

    @action(
        detail=True, methods=["POST"], url_path="read", serializer_class=None
    )
    @transaction.atomic()
    def handle_read_term(self, request, *args, **kwargs):
        """
        Get current term by type
        """
        term = self.get_object()
        user = request.user
        today = timezone.now().date()

        if (
            not user.read_terms.filter(term=term).exists()
            and term.period_start <= today
            and (term.period_end is None or today <= term.period_end)
        ):
            user.terms.add(
                term, through_defaults={"company_id": user.company_id}
            )
            return self.response_ok()

        return self.response_ok(
            {
                "detail": ERROR_MESSAGES["read_term"].format(
                    type=KEYWORDS[lower(term.type)]
                )
            },
        )

    def list(self, request, *args, **kwargs):
        """
        Get current terms by user
        """
        user = request.user
        if user.check_roles(RoleTypes.OPERATION_ADMIN.value):
            return self.response_ok()
        else:
            today = timezone.now().date()
            term_of_use = Term.objects.filter(
                Q(type=TermTypes.TERM_OF_USE.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            privacy_policy = Term.objects.filter(
                Q(type=TermTypes.PRIVACY_POLICY.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            data = []
            if (
                term_of_use
                and not user.read_terms.filter(term=term_of_use).exists()
            ):
                data.append(TermSerializer(term_of_use).data)
            if (
                privacy_policy
                and not user.read_terms.filter(term=privacy_policy).exists()
            ):
                data.append(TermSerializer(privacy_policy).data)

            return self.response_ok(data)
