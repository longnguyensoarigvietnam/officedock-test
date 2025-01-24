from django.db.models.signals import post_save
from django.dispatch import receiver

from users.models import User
from chat.models import ChatRoom
from chat.constants import ChatRoomNames, ChatRoomTypes


@receiver(post_save, sender=User)
def create_chat_room_default(sender, instance, created, **kwargs):
    """
    Create chat room default
    """
    company = instance.company

    # Handle TASK type rooms
    task_rooms = instance.chat_rooms.filter(type=ChatRoomTypes.TASK.value)
    if not task_rooms.exists():
        task_room = ChatRoom.objects.create(
            type=ChatRoomTypes.TASK.value,
            company=company,
            name=ChatRoomNames.TASK_CARD.value,
        )
        task_room.participants.add(
            instance, through_defaults={"company": company}
        )

    # Handle SKILL type rooms
    skill_rooms = instance.chat_rooms.filter(type=ChatRoomTypes.SKILL.value)
    if not skill_rooms.exists():
        skill_room = ChatRoom.objects.create(
            type=ChatRoomTypes.SKILL.value,
            company=company,
            name=ChatRoomNames.SKILL_UP.value,
        )
        skill_room.participants.add(
            instance, through_defaults={"company": company}
        )
