from django.db.models.signals import post_save
from django.dispatch import receiver

from users.models import User
from chat.models import ChatRoom
from chat.constants import ROOM_TYPES


@receiver(post_save, sender=User)
def create_chat_room_default(sender, instance, created, **kwargs):
    """
    Create chat room default
    """
    if created:
        instance.set_setting()

    company = instance.company

    for room_type, room_name in ROOM_TYPES:
        if not instance.chat_rooms.filter(type=room_type.value).exists():
            room = ChatRoom.objects.create(
                type=room_type.value,
                company=company,
                name=room_name.value,
            )
            room.participants.add(
                instance, through_defaults={"company": company}
            )
