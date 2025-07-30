from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from chat.models import ChatMessage, ChatRoom, ChatRoomsParticipants
from chat.constants import (
    ChatMessageTypes,
    USER_ACTION_GROUP,
    WebSocketEventType,
)
from chat.serializers import (
    ChatMessageSerializer,
    ChatRoomsParticipantsSerializer,
    ChatRoomsParticipantsWebSocketSerializer,
)

from common.utils import (
    convert_to_camel_case,
    parse_camel_case_json,
    send_web_socket_event,
)
from tasks.models import Task


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle new WebSocket connections."""
        self.user = self.scope["user"]

        if isinstance(self.user, AnonymousUser):
            await self.close()
            return

        self.user_action_group = USER_ACTION_GROUP.format(self.user.id)
        self.chat_room_codes = await self.get_all_chat_room_codes()

        # Join the necessary room groups
        await self.channel_layer.group_add(
            self.user_action_group, self.channel_name
        )
        for code in self.chat_room_codes:
            await self.channel_layer.group_add(code, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnections."""
        if hasattr(self, "user_action_group"):
            await self.channel_layer.group_discard(
                self.user_action_group, self.channel_name
            )

        if hasattr(self, "chat_room_codes"):
            for code in self.chat_room_codes:
                await self.channel_layer.group_discard(code, self.channel_name)

    async def receive(self, text_data):
        """Receive messages from WebSocket."""
        text_data_json = parse_camel_case_json(text_data)
        action = text_data_json.get("action")
        code = text_data_json.get("code")

        match action:
            case WebSocketEventType.MESSAGE.value:
                message = text_data_json.get("message")
                data = await self.save_message(code, message)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    code, {"type": "send_event", "data": data}
                )
            case WebSocketEventType.CREATION_TASK.value:
                message = text_data_json.get("message")
                task_id = text_data_json.get("task_id")
                data = await self.save_message(code, message, action, task_id)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    self.user_action_group, {"type": "send_event", "data": data}
                )
            case WebSocketEventType.DELETE_MESSAGE.value:
                message_id = text_data_json.get("message_id")
                data = await self.delete_message(code, message_id)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    code, {"type": "send_event", "data": data}
                )
            case WebSocketEventType.EDIT_MESSAGE.value:
                message = text_data_json.get("message")
                message_id = text_data_json.get("message_id")
                data = await self.edit_message(code, message, message_id)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    code, {"type": "send_event", "data": data}
                )
            case (
                WebSocketEventType.HIDE_ROOM.value
                | WebSocketEventType.SHOW_ROOM.value
            ):
                data = await self.hide_chat_room(code)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    self.user_action_group, {"type": "send_event", "data": data}
                )
            case (
                WebSocketEventType.PIN_ROOM.value
                | WebSocketEventType.UNPIN_ROOM.value
            ):
                data = await self.pin_chat_room(code)
                if not data:
                    await self.send_error_event()
                    return

                await self.channel_layer.group_send(
                    self.user_action_group, {"type": "send_event", "data": data}
                )
            case __:
                await self.send_error_event()

    async def send_event(self, event):
        """Handle event to WebSocket."""
        await self.send(text_data=convert_to_camel_case(event["data"]))

    async def send_error_event(self):
        """Handle error event to WebSocket."""
        data = {
            "action": WebSocketEventType.ERROR.value,
            "chat_room": None,
            "chat_message": None,
        }
        await self.send(text_data=convert_to_camel_case(data))

    @database_sync_to_async
    def save_message(
        self,
        code,
        message,
        action=WebSocketEventType.MESSAGE.value,
        task_id=None,
    ):
        """Save and send a chat message."""
        room = ChatRoom.objects.filter(code=code).first()
        if room:
            if not room.chat_rooms_participants.filter(user=self.user).exists():
                return False

            chat_message = None
            if action == ChatMessageTypes.CREATION_TASK.value:
                task = Task.objects.filter(id=task_id).first()
                if task:
                    chat_message = ChatMessage.objects.create(
                        chat_room=room,
                        sender=self.user,
                        message=message,
                        type=action,
                        task=task,
                    )
            else:
                chat_message = ChatMessage.objects.create(
                    chat_room=room, sender=self.user, message=message
                )

            if not chat_message:
                return False

            # Show all chat room if hidden when recieve chat message
            chat_room_participants = room.chat_rooms_participants.all()
            participant = chat_room_participants.filter(user=self.user).first()
            for item in chat_room_participants:
                if item.user.id == self.user.id:
                    participant = item
                else:
                    if not item.is_muted:
                        item.unread_messages = item.unread_messages + 1
                        item.save()
                    # Handle case realtime when send chat message
                    send_web_socket_event(
                        {
                            "client_id": None,
                            "action": ChatMessageTypes.MESSAGE.value,
                            "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                                item
                            ).data,
                            "chat_message": ChatMessageSerializer(
                                chat_message
                            ).data,
                        },
                        item,
                    )

            return {
                "client_id": None,
                "action": ChatMessageTypes.CREATION_TASK.value,
                "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                    participant
                ).data,
                "chat_message": ChatMessageSerializer(chat_message).data,
            }

        return False

    @database_sync_to_async
    def edit_message(self, code, message, message_id):
        """Edit a chat message."""
        chat_message = ChatMessage.objects.filter(id=message_id).first()
        if chat_message:
            chat_message.message = message
            chat_message.save()
            return {
                "action": WebSocketEventType.EDIT_MESSAGE.value,
                "chat_room": {"code": code},
                "chat_message": ChatMessageSerializer(chat_message).data,
            }
        return False

    @database_sync_to_async
    def delete_message(self, code, message_id):
        """Delete a chat message."""
        chat_message = ChatMessage.objects.filter(id=message_id).first()
        if chat_message:
            chat_message.soft_delete()
            return {
                "action": WebSocketEventType.DELETE_MESSAGE.value,
                "chat_room": {"code": code},
                "chat_message": ChatMessageSerializer(chat_message).data,
            }
        return False

    @database_sync_to_async
    def get_all_chat_room_codes(self):
        """Get all chat room codes the user is a part of."""
        chat_room_codes = ChatRoom.objects.filter(
            participants__id=self.user.id
        ).values_list("code", flat=True)
        return list(chat_room_codes)

    @database_sync_to_async
    def pin_chat_room(self, code):
        """Pin or unpin a chat room for the user."""
        participant = ChatRoomsParticipants.objects.filter(
            chat_room__code=code, user=self.user
        ).first()
        action = WebSocketEventType.PIN_ROOM.value
        if participant:
            if participant.pin_at:
                action = WebSocketEventType.UNPIN_ROOM.value
                participant.pin_at = None
            else:
                participant.pin_at = timezone.now()
            participant.save()

            return {
                "action": action,
                "user": self.user.id,
                "chat_room": ChatRoomsParticipantsSerializer(participant).data,
            }
        return False
