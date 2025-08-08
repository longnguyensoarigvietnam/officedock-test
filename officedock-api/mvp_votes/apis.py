from django.db import transaction
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES
from base.paginations import CustomCursorPagination
from mvp_votes.constants import Timeline
from mvp_votes.filters import MVPVoteFilter
from mvp_votes.models import MVPVote, MVPVoteManagement
from mvp_votes.payloads import build_list_mvp_vote_manage_payload
from mvp_votes.serializers import (
    MvpVoteManagementSerializer,
    MvpVoteCandidateSerializer,
)


@extend_schema(tags=["System > MVP Vote Management"])
class MVPVoteManagementViewSet(BaseAPIViewSet, ModelViewSet):
    """
    Endpoint to manage MVP Vote
    """

    queryset = MVPVoteManagement.objects.all()
    serializer_class = MvpVoteManagementSerializer
    pagination_class = CustomCursorPagination

    def get_queryset(self):
        user = self.request.user
        return super().get_queryset().filter(company=user.company)

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Handle create MVP vote
        """
        serializer_data = serializer.validated_data
        candidates = serializer_data.pop("candidates", [])
        user = self.request.user
        company = user.company
        serializer_data["company"] = company
        serializer_data["created_by"] = user
        mvp_vote = serializer.save()
        for candidate in candidates:
            mvp_vote.candidates.add(
                candidate, through_defaults={"company": company}
            )

    @transaction.atomic()
    def perform_update(self, serializer):
        """
        Handle update mvp vote
        """
        serializer_data = serializer.validated_data
        new_candidates = set(serializer_data.pop("candidates", []))
        user = self.request.user
        company = user.company
        mvp_vote = serializer.save(updated_by=user, company=company)
        if new_candidates:
            current_candidates = set(mvp_vote.candidates.all())
            to_remove = current_candidates - new_candidates
            to_add = new_candidates - current_candidates
            # Remove candidates
            mvp_vote.candidates.remove(*to_remove)
            # Add new candidates
            for candidate in to_add:
                mvp_vote.candidates.add(
                    candidate, through_defaults={"company": company}
                )

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "timeline",
                type=str,
                enum=[
                    Timeline.FUTURE.value,
                    Timeline.PRESENT.value,
                    Timeline.PAST.value,
                ],
            ),
            OpenApiParameter("ordering", type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Handle get list of mvp vote by timeline
        """
        timeline = request.query_params.get("timeline")
        user = request.user
        mvp_votes = (
            self.get_queryset()
            .filter(company=user.company)
            .prefetch_related("mvp_candidates", "candidates")
        )
        if timeline == Timeline.FUTURE.value:
            mvp_votes = mvp_votes.filter(
                end_date__gte=now(), is_start=False
            ).all()
        elif timeline == Timeline.PRESENT.value:
            mvp_vote = mvp_votes.filter(
                start_date__lte=now(), end_date__gte=now(), is_start=True
            ).first()

            return self.response_ok(
                build_list_mvp_vote_manage_payload(mvp_vote)
            )
        elif timeline == Timeline.PAST.value:
            mvp_votes = mvp_votes.filter(
                end_date__lt=now(),
            ).all()

        return self.response_pagination(
            request,
            mvp_votes,
            MvpVoteManagementSerializer,
            CustomCursorPagination,
        )

    def retrieve(self, request, *args, **kwargs):
        """
        Get detail of mvp vote
        """
        instance = self.get_object()
        return self.response_ok(build_list_mvp_vote_manage_payload(instance))


@extend_schema(tags=["System > MVP Vote"])
class MVPVoteViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
):
    queryset = MVPVote.objects.all()
    serializer_class = MvpVoteCandidateSerializer
    filterset_class = MVPVoteFilter

    def get_queryset(self):
        user = self.request.user
        return super().get_queryset().filter(company=user.company)

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Handle create mvp vote
        """
        user = self.request.user
        if (
            self.get_queryset()
            .filter(
                mvp_candidate=serializer.validated_data.get("mvp_candidate"),
                voter=user,
            )
            .exists()
        ):
            raise ValidationError({"detail": ERROR_MESSAGES["unique_vote"]})
        serializer.save(voter=user, company=user.company)
