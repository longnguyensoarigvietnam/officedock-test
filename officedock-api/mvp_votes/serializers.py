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
        ]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        candidates = attrs.get("candidates")
        is_start = attrs.get("is_start")
        instance = self.instance
        mvp_vote = None
        if start_date and end_date:
            mvp_vote = MVPVoteManagement.objects.filter(
                start_date__lt=end_date, end_date__gt=start_date
            )
        elif start_date:
            mvp_vote = MVPVoteManagement.objects.filter(
                start_date__lte=start_date, end_date__gte=start_date
            )
        elif end_date:
            mvp_vote = MVPVoteManagement.objects.filter(
                start_date__lte=end_date, end_date__gte=end_date
            )
        if mvp_vote and (
            instance
            and mvp_vote.exclude(id=instance.id).exists()
            or not instance
            and mvp_vote.exists()
        ):
            raise ValidationError(
                {"detail": ERROR_MESSAGES["cannot_start_vote"]}
            )

        if is_start is True:
            is_exist_voting = MVPVoteManagement.objects.filter(
                start_date__lte=now(), end_date__gte=now(), is_start=True
            ).exists()
            if is_exist_voting or instance and instance.end_date < now():
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
