from copy import deepcopy

from django.db.models import Count

from common.constants import AVATAR_GCS_EXPIRATION_SECONDS
from common.utils import get_signed_url
from organizations.models import Organization, UsersOrganizations
from organizations.serializers import BaseOrganizationSerializer
from users.models import User
from mvp_votes.serializers import MvpVoteManagementSerializer


def build_list_mvp_vote_manage_payload(mvp_votes, many=False):
    """
    Convert MVPVoteManagement queryset to flat JSON dict list, avoiding N+1 queries.
    """
    if not mvp_votes:
        return None

    if many:
        unique_candidate_ids = set(
            User.objects.filter(mvp_vote_managements__in=mvp_votes).values_list(
                "id", flat=True
            )
        )
        unique_created_by_ids = set(
            mvp_votes.filter(created_by__isnull=False).values_list(
                "created_by", flat=True
            )
        )
        unique_updated_by_ids = set(
            mvp_votes.filter(updated_by__isnull=False).values_list(
                "updated_by", flat=True
            )
        )
        unique_user_ids = (
            unique_candidate_ids | unique_created_by_ids | unique_updated_by_ids
        )
    else:
        unique_user_ids = set(
            User.objects.filter(mvp_vote_managements=mvp_votes).values_list(
                "id", flat=True
            )
        )
        unique_user_ids.add(mvp_votes.created_by_id)
        unique_user_ids.add(mvp_votes.updated_by_id)
    # Get organization map
    main_org_map = {
        uo["user_id"]: {
            "id": uo["organization_id"],
            "name": uo["organization__name"],
            "uuid": uo["organization__uuid"],
        }
        for uo in UsersOrganizations.objects.filter(
            user__id__in=unique_user_ids, is_main=True
        ).values(
            "user_id",
            "organization_id",
            "organization__name",
            "organization__uuid",
        )
    }
    # Get candidate map
    candidates_map = {
        user["id"]: {
            "id": user["id"],
            "full_name": user["profile__full_name"],
            "avatar": get_signed_url(
                user["avatar"], AVATAR_GCS_EXPIRATION_SECONDS
            ),
            "avatar_color": user["avatar_color"],
            "main_organization": main_org_map.get(user["id"]),
        }
        for user in User.objects.filter(id__in=unique_user_ids).values(
            "id", "profile__full_name", "avatar", "avatar_color"
        )
    }
    if many:
        result = []
        # Build mvp vote payloads
        for mvp_vote in mvp_votes:
            result.append(build_mvp_vote_payload(mvp_vote, candidates_map))
    else:
        result = build_mvp_vote_payload(mvp_votes, candidates_map, main_org_map)
        user_count = mvp_votes.company.users.count()
        result["total_voters"] = user_count

    return result


def build_mvp_vote_payload(mvp_vote, candidates_map, org_map=None):
    data = MvpVoteManagementSerializer(mvp_vote).data
    if org_map and mvp_vote.selected_organizations:
        org_ids = list(map(int, mvp_vote.selected_organizations.split(",")))
        orgs = Organization.objects.filter(id__in=org_ids).all()
        data["organizations"] = BaseOrganizationSerializer(orgs, many=True).data
    data["created_by"] = (
        candidates_map.get(mvp_vote.created_by.id)["full_name"]
        if candidates_map.get(mvp_vote.created_by_id)
        else None
    )
    data["updated_by"] = (
        candidates_map.get(mvp_vote.updated_by.id)["full_name"]
        if candidates_map.get(mvp_vote.updated_by_id)
        else None
    )
    data["candidates"] = []
    candidates = mvp_vote.mvp_candidates.annotate(
        vote_count=Count("votes_received")
    )
    for candidate_vote in candidates:
        candidate_map = deepcopy(candidates_map.get(candidate_vote.user.id))
        candidate_map["vote_count"] = candidate_vote.vote_count
        candidate_map["mvp_candidate_id"] = candidate_vote.id
        data["candidates"].append(candidate_map)
    return data


def build_present_mvp_vote_with_organization_list(mvp_vote, user):
    """
    Handle build payload for present MVP vote with organization list candidate
    """
    data = MvpVoteManagementSerializer(mvp_vote).data
    unique_user_ids = set(
        User.objects.filter(mvp_vote_managements=mvp_vote).values_list(
            "id", flat=True
        )
    )
    candidates_map = {
        user["id"]: {
            "id": user["id"],
            "full_name": user["profile__full_name"],
            "avatar": get_signed_url(
                user["avatar"], AVATAR_GCS_EXPIRATION_SECONDS
            ),
            "avatar_color": user["avatar_color"],
        }
        for user in User.objects.filter(id__in=unique_user_ids).values(
            "id", "profile__full_name", "avatar", "avatar_color"
        )
    }
    if mvp_vote.selected_organizations:
        data["organizations"] = []
        org_ids = list(map(int, mvp_vote.selected_organizations.split(",")))
        orgs = Organization.objects.filter(id__in=org_ids).all()
        votes = user.mvp_votes.filter(mvp_vote_management=mvp_vote).values_list(
            "mvp_candidate", flat=True
        )
        candidates = mvp_vote.mvp_candidates.all()
        for org in orgs:
            organization = BaseOrganizationSerializer(org).data
            candidate_in_organization = UsersOrganizations.objects.filter(
                user__id__in=unique_user_ids, organization=org
            ).values_list("user_id", flat=True)
            organization["candidates"] = []
            for candidate in candidates:
                if candidate.user.id in candidate_in_organization:
                    candidate_map = deepcopy(candidates_map[candidate.user.id])
                    candidate_map["is_voted"] = candidate.id in votes
                    candidate_map["mvp_candidate_id"] = candidate.id
                    organization["candidates"].append(candidate_map)
            data["organizations"].append(organization)

    return data
