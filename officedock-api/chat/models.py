import uuid

from django.db import models
from django.utils import timezone

from base.models import BaseModel
from chat.constants import ChatMessageTypes, ChatRoomTypes
from common.utils import generate_unique_code


class ChatRoom(BaseModel):
    """
    Chat Room model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="chat_rooms",
        on_delete=models.CASCADE,
    )
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    participants = models.ManyToManyField(
        "users.User", related_name="chat_rooms", through="ChatRoomsParticipants"
    )
    type = models.CharField(
        max_length=15, null=True, blank=True, choices=ChatRoomTypes.choices()
    )
    memo = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generate unique code when creating
        if self.id is None:
            self.code = generate_unique_code(ChatRoom, "code", 10)
        super().save(*args, **kwargs)


class ChatRoomsParticipants(BaseModel):
    """
    Chat rooms participants model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="chat_rooms_participants",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="chat_rooms_participants",
    )
    chat_room = models.ForeignKey(
        "ChatRoom",
        on_delete=models.CASCADE,
        related_name="chat_rooms_participants",
    )
    unread_messages = models.IntegerField(default=0)
    hidden_at = models.DateTimeField(null=True, blank=True)
    pin_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Set default company when creating
        self.company = self.user.company

        # Romove pin if hide chat room
        if self.hidden_at:
            self.pin_at = None

        super().save(*args, **kwargs)


class ChatMessage(BaseModel):
    """
    Chat messages model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="chat_messages",
        on_delete=models.CASCADE,
    )
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    chat_room = models.ForeignKey(
        "ChatRoom", on_delete=models.CASCADE, related_name="chat_messages"
    )
    sender = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="chat_messages"
    )
    task = models.ForeignKey(
        "tasks.Task",
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    schedule = models.ForeignKey(
        "calendars.Schedule",
        related_name="chat_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    message = models.TextField()
    is_edited = models.BooleanField(default=False)
    bookmark_at = models.DateTimeField(null=True, blank=True)
    type = models.CharField(
        max_length=100,
        choices=ChatMessageTypes.choices(),
        default=ChatMessageTypes.MESSAGE.value,
    )
    schedule_changes = models.JSONField(null=True, blank=True)
    submit_level = models.ForeignKey(
        "submit_levels.SubmitLevelHistory",
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    mentions = models.ManyToManyField(
        "users.User", related_name="mentioned_messages"
    )
    quote = models.JSONField(null=True, blank=True)
    reply = models.ForeignKey(
        "chat.ChatMessage",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reply_message",
    )
    tasks = models.ManyToManyField("tasks.Task", related_name="link_messages")

    def save(self, *args, **kwargs):
        # Set default company when creating
        self.company = self.chat_room.company

        # Set is_edited is True when update message
        if self.id and self.deleted_at is None:
            self.is_edited = True

        super().save(*args, **kwargs)

    def soft_delete(self):
        """
        Handle soft delete message
        """
        self.deleted_at = timezone.now()
        self.save()


class Reaction(BaseModel):
    """Reaction model"""

    company = models.ForeignKey(
        "companies.Company",
        related_name="reactions",
        on_delete=models.CASCADE,
    )
    chat_message = models.ForeignKey(
        ChatMessage,
        related_name="reactions",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "users.User",
        related_name="reactions",
        on_delete=models.CASCADE,
    )
    icon = models.CharField(max_length=255, null=True, blank=True)
