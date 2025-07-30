from django.core.files.storage import default_storage

from chat.constants import ChatRoomTypes
from chat.models import ChatRoom


def remove_chat_files(chat_files):
    """
    Remove associated files when a chat message is deleted.
    """
    for chat_file in chat_files:
        # Delete the original file if it exists
        if chat_file.original_file and default_storage.exists(
            chat_file.original_file.name
        ):
            default_storage.delete(chat_file.original_file.name)

        # Delete the compressed file if it exists
        if chat_file.compressed_file and default_storage.exists(
            chat_file.compressed_file.name
        ):
            default_storage.delete(chat_file.compressed_file.name)

        # Remove the chat file record from the database
        chat_file.delete()


def build_chat_participant_payload(
    chat_room: ChatRoom,
    user,
    participant_data=[],
    participant=None,
    last_message_at=None,
) -> dict:
    """
    Convert ChatRoomsParticipants to flat JSON dict, avoiding N+1 queries.
    """
    # Determine chat name
    if chat_room.type == ChatRoomTypes.SELF.value:
        room_name = user["full_name"]
    elif chat_room.type == ChatRoomTypes.PRIVATE.value:
        room_name = user["full_name"] if participant else None
    else:
        room_name = chat_room.name

    return {
        "code": chat_room.code,
        "name": room_name,
        "type": chat_room.type,
        "unread_messages": participant.unread_messages,
        "pin_at": participant.pin_at,
        "last_message_at": last_message_at.isoformat()
        if last_message_at
        else None,
        "participants": participant_data,
        "is_muted": participant.is_muted,
    }
