from django.db import models
from base.models import BaseModel
from calendars.constants import ScheduleTypes
from companies.models import Company
from tags.models import Tag
from users.models import User


class Schedule(BaseModel):
    """
    Schedule model
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="schedules"
    )
    title = models.CharField(max_length=255)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_all_day = models.BooleanField(default=True)
    type = models.CharField(
        max_length=50, choices=ScheduleTypes.choices(), null=True, blank=True
    )
    tags = models.ManyToManyField(
        "tags.Tag",
        through="TagsSchedules",
        related_name="schedules",
    )
    address = models.CharField(max_length=255, null=True, blank=True)
    memo = models.TextField(null=True, blank=True)
    participants = models.ManyToManyField(
        "users.User",
        through="ParticipantsSchedules",
        related_name="schedules",
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    is_start = models.BooleanField(default=False)
    creator_id = models.IntegerField(null=True, blank=True)


class TagsSchedules(BaseModel):
    """
    Tags Schedules model
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="tags_schedules"
    )
    tag = models.ForeignKey(
        Tag, on_delete=models.CASCADE, related_name="tags_schedules"
    )
    schedule = models.ForeignKey(
        Schedule, on_delete=models.CASCADE, related_name="tags_schedules"
    )


class ParticipantsSchedules(BaseModel):
    """
    Participants Schedules model
    """

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="participants_schedules"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="participants_schedules"
    )
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="participants_schedules",
    )
