from django.db import models

from base.models import BaseModel
from mvp_votes.constants import MVPVoteTypes


class MVPVoteManagement(BaseModel):
    """
    Vote MVP management model
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="mvp_vote_managements",
    )
    title = models.CharField(null=True, blank=True)
    candidates = models.ManyToManyField(
        "users.User",
        related_name="mvp_vote_managements",
        through="MVPVoteCandidate",
    )
    selected_organizations = models.JSONField(
        null=True, blank=True, help_text="List of selected organization IDs"
    )
    bonus_point = models.IntegerField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="created_mvp_vote_managements",
        null=True,
        blank=True,
    )
    updated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        related_name="updated_mvp_vote_managements",
        null=True,
        blank=True,
    )
    type = models.CharField(
        choices=MVPVoteTypes.choices,
        default=MVPVoteTypes.UPCOMING.value,
        max_length=30,
    )


class MVPVoteCandidate(BaseModel):
    """
    MVP vote candidate model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="mvp_candidates",
        on_delete=models.CASCADE,
    )
    mvp_vote_management = models.ForeignKey(
        "mvp_votes.MVPVoteManagement",
        related_name="mvp_candidates",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "users.User",
        related_name="mvp_candidates",
        on_delete=models.CASCADE,
    )


class MVPVote(BaseModel):
    """
    MVP vote model
    """

    mvp_vote_management = models.ForeignKey(
        MVPVoteManagement,
        related_name="votes",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="mvp_votes",
        on_delete=models.CASCADE,
    )
    mvp_candidate = models.ForeignKey(
        MVPVoteCandidate,
        on_delete=models.CASCADE,
        related_name="votes_received",
    )
    voter = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="mvp_votes",
    )
    comment = models.CharField(
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ("mvp_vote_management", "voter")
