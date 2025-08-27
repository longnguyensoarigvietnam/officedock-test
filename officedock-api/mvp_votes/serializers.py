from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from base.messages import ERROR_MESSAGES
from common.serializers import CreationDataUserSerializer
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
            "is_start",
            "created_at",
        ]

    def validate(self, attrs):
        candidates = attrs.get("candidates")
        is_start = attrs.get("is_start")
        instance = self.instance

        if is_start is True and instance:
            is_exists_voting = MVPVoteManagement.objects.filter(
                end_date__gte=now(), is_start=True, company=instance.company
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


class MvpVoteCandidateSerializer(serializers.ModelSerializer):
    """
    Serializer for mvp vote candidate
    """

    class Meta:
        model = MVPVote
        fields = [
            "id",
            "mvp_candidate",
            "comment",
        ]
