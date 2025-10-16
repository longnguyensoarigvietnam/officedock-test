import io
import uuid
from PIL import Image
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.validators import FileExtensionValidator
from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from base.models import BaseModel
from common.constants import (
    ALLOW_IMAGE_FORMATS,
    CHAT_AVATAR_FOLDER_UPLOAD,
)
from chat.constants import (
    CHAT_FILES_FOLDER_UPLOAD,
    CHUNK_FILES_FOLDER_UPLOAD,
    ChatMessageTypes,
    ChatRoomTypes,
)
from common.utils import delete_file, generate_file_name, generate_unique_code
from base.messages import ERROR_MESSAGES
from users.constants import AvatarColors


class ChatRoom(BaseModel):
    """
    Chat Room model
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="chat_rooms",
        on_delete=models.CASCADE,
    )
    avatar = models.ImageField(
        upload_to=CHAT_AVATAR_FOLDER_UPLOAD,
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOW_IMAGE_FORMATS),
        ],
        null=True,
        blank=True,
    )
    avatar_color = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    participants = models.ManyToManyField(
        "users.User", related_name="chat_rooms", through="ChatRoomsParticipants"
    )
    type = models.CharField(
        max_length=15, null=True, blank=True, choices=ChatRoomTypes.choices()
    )
    memo = models.TextField(null=True, blank=True)
    select_organizations = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generate unique code when creating
        if self.id is None:
            self.code = generate_unique_code(ChatRoom, "code", 10)

        if self.avatar_color is None:
            self.avatar_color = AvatarColors.random()

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
    pin_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Set default company when creating
        self.company_id = self.user.company_id

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
    message = models.TextField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
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
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
    )
    tasks = models.ManyToManyField("tasks.Task", related_name="link_messages")
    bookmark_users = models.ManyToManyField(
        "users.User",
        through="Bookmark",
        related_name="bookmark_messages",
    )

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


class Bookmark(BaseModel):
    """Bookmark model"""

    company = models.ForeignKey(
        "companies.Company",
        related_name="bookmarks",
        on_delete=models.CASCADE,
    )
    chat_message = models.ForeignKey(
        ChatMessage,
        related_name="bookmarks",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "users.User",
        related_name="bookmarks",
        on_delete=models.CASCADE,
    )
    bookmark_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Set default company when creating
        self.company = self.chat_message.company
        super().save(*args, **kwargs)


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


def chat_file_upload_path(instance, filename):
    """Generate file upload path dynamically based on chat_room code"""
    return f"{CHAT_FILES_FOLDER_UPLOAD}/{instance.chat_room.code}/{filename}"


class ChatFile(BaseModel):
    """Model file upload to chat message"""

    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    company = models.ForeignKey(
        "companies.Company",
        related_name="chat_files",
        on_delete=models.CASCADE,
    )
    chat_room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, related_name="chat_files"
    )
    chat_messages = models.ManyToManyField(
        ChatMessage,
        related_name="chat_files",
        through="ChatFileChatMessage",
    )
    file_name = models.CharField(max_length=255)
    original_file = models.FileField(upload_to=chat_file_upload_path)
    compressed_file = models.FileField(
        upload_to=chat_file_upload_path, null=True, blank=True
    )
    file_type = models.CharField(max_length=255)
    file_size = models.FloatField()

    @classmethod
    def create_files(cls, company_id, room, message, uuids=[]):
        """
        Custom create method to handle file upload logic
        """
        try:
            for uuid in uuids:
                # Get ChatFile if exists uuid
                chat_file = ChatFile.objects.filter(
                    uuid=uuid, company_id=company_id
                ).first()
                if (
                    chat_file
                    and not chat_file.chat_messages.filter(
                        id=message.id
                    ).exists()
                ):
                    with transaction.atomic():
                        chat_file.chat_messages.add(message.id)
                    continue
                # Fetch all chunks
                chunk_files = ChunkFile.objects.filter(file_uuid=uuid).order_by(
                    "chunk_index"
                )

                if not chunk_files.exists():
                    raise ValueError(
                        {"detail": ERROR_MESSAGES["chunk_file_not_exists"]}
                    )

                # Get file metadata from the first chunk
                first_chunk = chunk_files.first()
                file_size = float(first_chunk.file_size) / (
                    1024 * 1024
                )  # Convert to MB
                file_name = first_chunk.file_name
                file_type = first_chunk.file_type

                # Merge chunks into a single file
                with io.BytesIO() as merged_file:
                    for chunk in chunk_files:
                        with chunk.chunk_file.open("rb") as chunk_data:
                            merged_file.write(chunk_data.read())

                    # Reset stream position and get the merged data
                    merged_file.seek(0)
                    merged_data = merged_file.getvalue()

                    # Define GCS storage path
                    gcs_path = f"{CHAT_FILES_FOLDER_UPLOAD}/{room.code}/{generate_file_name(file_name)}"

                    # Upload the merged file to GCS
                    default_storage.save(gcs_path, ContentFile(merged_data))

                    # Compress image if applicable using the stored data
                    compressed_file = (
                        cls.compress_image_static(io.BytesIO(merged_data))
                        if file_type.startswith("image")
                        else None
                    )

                # Create ChatFile record in a transaction
                with transaction.atomic():
                    chat_file = ChatFile.objects.create(
                        uuid=uuid,
                        company_id=company_id,
                        chat_room=room,
                        file_name=file_name,
                        original_file=gcs_path,
                        compressed_file=compressed_file,
                        file_type=file_type,
                        file_size=file_size,
                    )
                    if chat_file:
                        chat_file.chat_messages.add(message.id)
                    # Delete chunk files after merging
                    for chunk in chunk_files:
                        delete_file(chunk.chunk_file.name)
                    chunk_files.delete()

            return cls
        except Exception:
            for uuid in uuids:
                # Clean up
                chunk_files = ChunkFile.objects.filter(file_uuid=uuid)
                for chunk in chunk_files:
                    delete_file(chunk.chunk_file.name)
                chunk_files.delete()

            raise ValidationError(
                {"detail": ERROR_MESSAGES["chunk_file_not_exists"]}
            )

    @staticmethod
    def compress_image_static(
        image_file,
        default_size=300,
        quality=100,
    ):
        """
        Resize to optimize image
        """
        # Open the uploaded image
        image = Image.open(image_file)
        image_width = float(image.width)
        image_height = float(image.height)

        # Get file extend
        format = image.format

        if image_width > default_size or image_height > default_size:
            # Choose the max ratio to fit
            ratio = max(
                default_size / image_width,
                default_size / image_height,
            )
            new_size = (int(image_width * ratio), int(image_height * ratio))

            # Resize the image
            image = image.resize(new_size, Image.Resampling.NEAREST)

        # Save the optimized image to a BytesIO object with specified quality
        io_img = io.BytesIO()
        image.save(io_img, format=format, quality=quality)
        optimized_image = ContentFile(
            io_img.getvalue(),
            name=generate_file_name(),
        )

        return optimized_image


class ChunkFile(BaseModel):
    """
    Chunk file model
    """

    file_uuid = models.UUIDField()
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=255)
    file_size = models.FloatField()
    chunk_index = models.IntegerField()
    total_chunks = models.IntegerField()
    chunk_file = models.FileField(upload_to=CHUNK_FILES_FOLDER_UPLOAD)


class ChatFileChatMessage(BaseModel):
    """
    Chat file chat message model
    """

    chat_file = models.ForeignKey(
        ChatFile,
        on_delete=models.CASCADE,
        related_name="chat_file_chat_messages",
    )
    chat_message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name="chat_file_chat_messages",
    )
