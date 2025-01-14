from django.core.management.base import BaseCommand
from chat.models import ChatRoom
from common.utils import generate_unique_code


class Command(BaseCommand):
    help = "Seed fake chat room code"

    def handle(self, *args, **kwargs):
        # Generate new code for chat room
        for room in ChatRoom.objects.all():
            room.code = generate_unique_code(ChatRoom, "code", 10)
            room.save()

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded chat room code")
        )
