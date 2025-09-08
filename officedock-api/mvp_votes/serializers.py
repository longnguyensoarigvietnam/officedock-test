from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from common.serializers import (
    CreationDataUserSerializer,
    CreationDataUserWithMainOrganizationSerializer,
)
from mvp_votes.constants import MVPVoteTypes
from users.models import User
from mvp_votes.models import MVPVote, MVPVoteManagement


class MvpVoteManagementSerializer(serializers.ModelSerializer):
    """
    MvpVoteManagementSerializer
    """

    candidate_ids = serializers.PrimaryKeyRelatedField(
        source="candidates",
        many=True,
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    created_by = CreationDataUserSerializer(read_only=True)
    updated_by = CreationDataUserSerializer(read_only=True)
    is_start = serializers.BooleanField(required=False)
    top_candidates = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MVPVoteManagement
        fields = [
            "id",
            "title",
            "candidate_ids",
            "selected_organizations",
            "bonus_point",
            "start_date",
            "end_date",
            "created_by",
            "updated_by",
            "type",
            "created_at",
            "is_start",
            "top_candidates",
        ]

    def validate(self, attrs):
        candidates = attrs.get("candidates")
        is_start = attrs.get("is_start")
        end_date = attrs.get("end_date", None)
        instance = self.instance
        if end_date and (
            (
                instance
                and instance.type == MVPVoteTypes.UPCOMING.value
                and end_date <= now()
            )
            or (not instance and end_date <= now())
        ):
            raise ValidationError(
                {"end_date": ERROR_MESSAGES["end_time_in_future"]}
            )
        if is_start is True and instance:
            is_exists_voting = MVPVoteManagement.objects.filter(
                type=MVPVoteTypes.PRESENT.value, company=instance.company
            ).exclude(id=instance.id)
            if is_exists_voting.exists() or instance.end_date < now():
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["cannot_start_vote"]}
                )

        if candidates:
            company_ids = set(
                [candidate.company.id for candidate in candidates]
            )
            if len(company_ids) > 1:
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["company_not_match"]}
                )

        return attrs

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        candidate_count = instance.mvp_candidates.count()
        user_count = User.objects.filter(company=instance.company).count()
        representation["is_all_users"] = candidate_count == user_count

        return representation

    def get_top_candidates(self, instance):
        """
        Handle get 1st Mvp
        """
        from mvp_votes.payloads import get_users_in_top_mvp

        users = get_users_in_top_mvp(instance)
        return CreationDataUserWithMainOrganizationSerializer(
            users, many=True
        ).data


class MvpVoteSerializer(serializers.ModelSerializer):
    """
    Serializer for mvp vote candidate
    """

    class Meta:
        model = MVPVote
        fields = [
            "id",
            "mvp_vote_management",
            "mvp_candidate",
            "comment",
            "deleted_at",
        ]
