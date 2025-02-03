from django.db import migrations
from chat.constants import ChatRoomTypes, ChatRoomNames
from common.utils import generate_unique_code


def seed_data_notify_chat_room(apps, schema_editor):
    """
    Remove duplicate chat room type task and skill, keeping the one with the smallest ID.
    """
    User = apps.get_model("users", "User")
    chat_room = apps.get_model("chat", "ChatRoom")

    for user in User.objects.all():
        # Handle TASK type rooms
        task_rooms = user.chat_rooms.filter(type=ChatRoomTypes.TASK.value)
        if not task_rooms.exists():
            code = generate_unique_code(chat_room, "code", 10)
            task_room = chat_room.objects.create(
                code=code,
                type=ChatRoomTypes.TASK.value,
                company=user.company,
                name=ChatRoomNames.TASK_CARD.value,
            )
            task_room.participants.add(
                user, through_defaults={"company": user.company}
            )

        # Handle SKILL type rooms
        skill_rooms = user.chat_rooms.filter(type=ChatRoomTypes.SKILL.value)
        if not skill_rooms.exists():
            code = generate_unique_code(chat_room, "code", 10)
            skill_room = chat_room.objects.create(
                code=code,
                type=ChatRoomTypes.SKILL.value,
                company=user.company,
                name=ChatRoomNames.SKILL_UP.value,
            )
            skill_room.participants.add(
                user, through_defaults={"company": user.company}
            )


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0004_remove_duplicate_chat_room_type_task_and_skill"),
    ]

    operations = [
        migrations.RunPython(
            seed_data_notify_chat_room, migrations.RunPython.noop
        ),
    ]
