from copy import deepcopy

from django.db.models import Q, Count, Max

from base.messages import KEYWORDS
from mvp_votes.models import MVPVoteCandidate
from organizations.models import Organization, UsersOrganizations
from organizations.serializers import BaseOrganizationSerializer
from users.models import User
from mvp_votes.serializers import (
    MvpVoteManagementSerializer,
    UserCandidateMVPSerializer,
)


def build_list_mvp_vote_manage_payload(
    mvp_votes, many=False, is_show_in_mypage=False
):
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
            "name": uo["organization__name"]
            if uo["organization__deleted_at"] == None
            else f"{uo['organization__name']}{KEYWORDS['deleted']}",
            "uuid": uo["organization__uuid"],
        }
        for uo in UsersOrganizations.objects.filter(
            user__id__in=unique_user_ids, is_main=True
        ).values(
            "user_id",
            "organization_id",
            "organization__name",
            "organization__uuid",
            "organization__deleted_at",
        )
    }

    user_candidates = (
        User.objects.filter(id__in=unique_user_ids)
        .select_related("profile")
        .only("id", "profile", "avatar", "avatar_color", "deleted_at")
    )
    # Get candidate map
    candidates_map = {
        user.id: UserCandidateMVPSerializer(
            user, context={"main_organization": main_org_map.get(user.id)}
        ).data
        for user in user_candidates
    }
    if many:
        result = []
        # Build mvp vote payloads
        for mvp_vote in mvp_votes:
            result.append(build_mvp_vote_payload(mvp_vote, candidates_map))
    else:
        result = build_mvp_vote_payload(
            mvp_votes, candidates_map, main_org_map, is_show_in_mypage
        )
        user_count = mvp_votes.company.users.count()
        result["total_voters"] = user_count

    return result


def build_mvp_vote_payload(
    mvp_vote, candidates_map, org_map=None, is_show_in_mypage=False
):
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
        if is_show_in_mypage and candidate_vote.vote_count <= 0:
            continue
        candidate_map = deepcopy(candidates_map.get(candidate_vote.user.id))
        candidate_map["vote_count"] = candidate_vote.vote_count
        candidate_map["mvp_candidate_id"] = candidate_vote.id
        data["candidates"].append(candidate_map)
    data["candidates"] = sorted(
        data["candidates"], key=lambda x: x["vote_count"], reverse=True
    )
    return data


def build_present_mvp_vote_with_organization_list(mvp_vote, user):
    """
    Handle build payload for present MVP vote with organization list candidate
    """
    if not mvp_vote:
        return None
    data = MvpVoteManagementSerializer(mvp_vote).data
    unique_user_ids = set(
        User.objects.filter(mvp_vote_managements=mvp_vote).values_list(
            "id", flat=True
        )
    )
    user_candidates = (
        User.objects.filter(id__in=unique_user_ids)
        .select_related("profile")
        .only("id", "profile", "avatar", "avatar_color", "deleted_at")
    )
    # Get candidate map
    candidates_map = {
        user.id: UserCandidateMVPSerializer(user).data
        for user in user_candidates
    }

    unique_candidate_ids = set()
    votes = user.mvp_votes.filter(mvp_vote_management=mvp_vote).values_list(
        "mvp_candidate", flat=True
    )
    data["is_voted"] = bool(votes)
    if mvp_vote.selected_organizations:
        data["organizations"] = []
        org_ids = list(map(int, mvp_vote.selected_organizations.split(",")))
        orgs = Organization.objects.filter(
            Q(users__in=unique_user_ids) | Q(id__in=org_ids)
        ).distinct()

        # Filter all users belonging to the selected organizations
        users_in_orgs = UsersOrganizations.objects.filter(
            organization__in=orgs
        ).values_list("user_id", flat=True)
        # Filter candidates belonging to the selected organizations
        candidates_in_orgs = mvp_vote.mvp_candidates.filter(
            user__id__in=users_in_orgs
        )
        # Add the IDs of these candidates to unique_candidate_ids
        unique_candidate_ids.update(
            candidates_in_orgs.values_list("id", flat=True)
        )
        # Process data for each organization
        for org in orgs:
            organization = BaseOrganizationSerializer(org).data
            # Filter candidates belonging only to the current organization
            org_candidates = candidates_in_orgs.filter(
                user__in=org.users.all()
            ).order_by("user__created_at")
            # Process data for each candidate in the current organization
            organization["candidates"] = []
            for candidate in org_candidates:
                candidate_map = deepcopy(candidates_map[candidate.user.id])
                candidate_map["is_voted"] = candidate.id in votes
                candidate_map["mvp_candidate_id"] = candidate.id
                organization["candidates"].append(candidate_map)
            data["organizations"].append(organization)
    data["remaining_candidates"] = []
    # Get candidates who don't belong to any of the selected organizations
    remaining_candidates = mvp_vote.mvp_candidates.exclude(
        id__in=unique_candidate_ids
    )
    for candidate in remaining_candidates:
        candidate_map = deepcopy(candidates_map[candidate.user.id])
        candidate_map["is_voted"] = candidate.id in votes
        candidate_map["mvp_candidate_id"] = candidate.id
        data["remaining_candidates"].append(candidate_map)

    return data


def get_users_in_top_mvp(mvp_vote):
    """
    Handle get users in top mvp
    """
    # Find the highest vote count
    max_votes = (
        MVPVoteCandidate.objects.filter(
            votes_received__mvp_vote_management=mvp_vote
        )
        .annotate(total_votes=Count("votes_received"))
        .aggregate(max_votes=Max("total_votes"))["max_votes"]
    )

    # Get all candidates with that max vote count
    top_candidate_ids = (
        MVPVoteCandidate.objects.filter(
            votes_received__mvp_vote_management=mvp_vote
        )
        .annotate(total_votes=Count("votes_received"))
        .filter(total_votes=max_votes)
        .values_list("user_id")
    )
    users = User.objects.filter(id__in=top_candidate_ids).all()
    return users
