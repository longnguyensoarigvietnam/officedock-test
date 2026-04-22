from django.core.management.base import BaseCommand

from tasks.constants import TaskStatus as TaskStatusConstants
from tasks.models import TaskStatus


class Command(BaseCommand):
    help = "Seed data for Task status"

    def handle(self, *args, **kwargs):
        # TODO: Remove condition later
        if TaskStatus.objects.filter(name="マイルーティン").exists():
            TaskStatus.objects.filter(name="マイルーティン").update(
                name=TaskStatusConstants.MY_ROUTINE.value
            )

        for status in TaskStatusConstants:
            if not TaskStatus.objects.filter(name=status.value).exists():
                TaskStatus.objects.create(name=status.value)

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded data for Task status")
        )
