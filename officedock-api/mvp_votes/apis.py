from django.db import transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.exceptions import ValidationError
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from base.apis import BaseAPIViewSet
from base.messages import ERROR_MESSAGES
from base.paginations import CustomCursorPagination
from base.filters import FilterByPermission
from base.permissions import ActionPermission
from common.services import TransactionService
from mvp_votes.constants import (
    DEFAULT_BONUS_POINT,
    DEFAULT_CONTENT_TWEET_END_VOTE,
    DEFAULT_CONTENT_TWEET_START_VOTE,
    MVPVoteTypes,
)
from mvp_votes.filters import MVPVoteFilter
from mvp_votes.models import MVPVote, MVPVoteCandidate, MVPVoteManagement
from mvp_votes.payloads import (
    build_list_mvp_vote_manage_payload,
    build_present_mvp_vote_with_organization_list,
)
from mvp_votes.serializers import (
    MvpVoteManagementSerializer,
    MvpVoteSerializer,
)
from tweets.models import Tweet
from roles.constants import Screens


@extend_schema(tags=["System > MVP Vote Management"])
class MVPVoteManagementViewSet(BaseAPIViewSet, ModelViewSet):
    """
    Endpoint to manage MVP Vote
    """

    queryset = MVPVoteManagement.objects.all()
    serializer_class = MvpVoteManagementSerializer
    pagination_class = CustomCursorPagination
    permission_classes = [ActionPermission]
    filter_backends = [FilterByPermission]
    screen_name = Screens.MVP_VOTING_MANAGEMENT.value

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
        serializer_data.pop("is_start")
        user = self.request.user
        company = user.company
        serializer_data["company"] = company
        serializer_data["created_by"] = user
        serializer_data["bonus_point"] = DEFAULT_BONUS_POINT
        serializer_data["type"] = MVPVoteTypes.UPCOMING.value
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
        old_mvp_vote = self.get_object()
        serializer_data = serializer.validated_data
        is_start = serializer_data.pop("is_start")
        new_candidates = set(serializer_data.pop("candidates", []))
        serializer_data.pop("bonus_point", None)
        user = self.request.user
        company = user.company
        # Create tweet when start vote
        if is_start:
            serializer_data["type"] = MVPVoteTypes.PRESENT.value
            Tweet.objects.create(
                company=old_mvp_vote.company,
                is_system=True,
                content=DEFAULT_CONTENT_TWEET_START_VOTE,
            )
        # Create tweet when end vote
        elif old_mvp_vote.type == MVPVoteTypes.PRESENT.value and not is_start:
            serializer_data["type"] = MVPVoteTypes.PAST.value
            Tweet.objects.create(
                company=old_mvp_vote.company,
                is_system=True,
                content=DEFAULT_CONTENT_TWEET_END_VOTE,
            )
            # Handle add coin for users with most votes
            transaction_service = TransactionService()
            transaction_service.reward_mvp_vote_winners(self.get_object())

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
                    MVPVoteTypes.UPCOMING.value,
                    MVPVoteTypes.PRESENT.value,
                    MVPVoteTypes.PAST.value,
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
        if timeline == MVPVoteTypes.UPCOMING.value:
            mvp_votes = mvp_votes.filter(type=MVPVoteTypes.UPCOMING.value).all()
        elif timeline == MVPVoteTypes.PRESENT.value:
            mvp_vote = mvp_votes.filter(type=MVPVoteTypes.PRESENT.value).first()
            return self.response_ok(
                build_list_mvp_vote_manage_payload(mvp_vote)
                if mvp_vote
                else None
            )
        elif timeline == MVPVoteTypes.PAST.value:
            mvp_votes = mvp_votes.filter(type=MVPVoteTypes.PAST.value).all()

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

    @extend_schema(
        parameters=[
            OpenApiParameter("mvp_candidate_id", type=int),
            OpenApiParameter("ordering", type=str),
        ]
    )
    @action(detail=False, methods=["GET"], url_path="vote-comments")
    def get_vote_comments(self, request):
        """
        Get vote comments of mvp vote
        """
        mvp_candidate_id = request.query_params.get("mvp_candidate_id")
        candidate = get_object_or_404(MVPVoteCandidate, id=mvp_candidate_id)
        vote_comments = candidate.votes_received.exclude(
            Q(comment__isnull=True) | Q(comment="")
        ).all()
        return self.response_pagination(
            request,
            vote_comments,
            MvpVoteSerializer,
            CustomCursorPagination,
        )


@extend_schema(tags=["System > MVP Vote"])
class MVPVoteViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
):
    queryset = MVPVote.objects.all()
    serializer_class = MvpVoteSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = MVPVoteFilter
    pagination_class = CustomCursorPagination

    def get_queryset(self):
        user = self.request.user
        return (
            super()
            .get_queryset()
            .filter(company=user.company, deleted_at__isnull=True)
        )

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Handle create mvp vote
        """
        user = self.request.user
        mvp_vote_management = serializer.validated_data.get(
            "mvp_vote_management"
        )
        if MVPVote.objects.filter(
            mvp_vote_management=mvp_vote_management,
            voter=user,
        ).exists():
            raise ValidationError({"detail": ERROR_MESSAGES["unique_vote"]})
        serializer.save(voter=user, company=user.company)

    @extend_schema(
        parameters=[
            OpenApiParameter("ordering", type=str),
        ]
    )
    @action(url_path="announcements", detail=False, methods=["GET"])
    def get_announcements(self, request):
        """
        Get announcement of MVP vote
        """
        company = request.user.company
        mvp_votes = MVPVoteManagement.objects.annotate(
            vote_count=Count("votes")
        ).filter(
            type=MVPVoteTypes.PAST.value, company=company, vote_count__gt=0
        )

        return self.response_pagination(
            request,
            mvp_votes,
            MvpVoteManagementSerializer,
            CustomCursorPagination,
        )

    @action(url_path="voting", detail=False, methods=["GET"])
    def get_current_mvp_vote(self, request):
        """
        Get present MVP vote
        """
        company = request.user.company
        mvp_vote = MVPVoteManagement.objects.filter(
            type=MVPVoteTypes.PRESENT.value, company=company
        ).first()
        mvp_vote_payload = build_present_mvp_vote_with_organization_list(
            mvp_vote, request.user
        )

        return self.response_ok(mvp_vote_payload)

    def perform_destroy(self, instance):
        """
        Handle soft delete mvp vote comment
        """
        instance.soft_delete()

    @extend_schema(
        parameters=[
            OpenApiParameter("mvp_candidate_id", type=int),
        ]
    )
    @action(url_path="comment", detail=False, methods=["GET"])
    def get_vote_comment(self, request, *args, **kwargs):
        """
        Handle get vote comment of mvp candidate by user
        """
        user = request.user
        mvp_candidate_id = request.query_params.get("mvp_candidate_id")
        candidate = get_object_or_404(MVPVoteCandidate, id=mvp_candidate_id)
        mvp_vote = (
            self.get_queryset()
            .filter(mvp_candidate=candidate, voter=user)
            .first()
        )
        return self.response_ok(self.get_serializer(mvp_vote).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("mvp_vote_id", type=int),
        ]
    )
    @action(methods=["GET"], detail=False, url_path="announcement-detail")
    def get_announcement_detail(self, request):
        """
        Handle get detail MVP Vote
        """
        company = request.user.company
        mvp_vote_id = request.query_params.get("mvp_vote_id")
        if mvp_vote_id:
            mvp_vote = get_object_or_404(MVPVoteManagement, id=mvp_vote_id)
        else:
            mvp_vote = (
                MVPVoteManagement.objects.annotate(vote_count=Count("votes"))
                .filter(
                    type=MVPVoteTypes.PAST.value,
                    company=company,
                    vote_count__gt=0,
                )
                .order_by("-end_date")
                .first()
            )
        return self.response_ok(
            build_list_mvp_vote_manage_payload(mvp_vote, is_show_in_mypage=True)
        )
