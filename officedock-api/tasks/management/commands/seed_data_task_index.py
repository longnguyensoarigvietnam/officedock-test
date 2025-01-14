from django.core.management.base import BaseCommand

from tasks.models import Task, TaskIndex


class Command(BaseCommand):
    help = "Seed data with last index for Task"

    def handle(self, *args, **kwargs):
        list_tasks = Task.objects.all()

        for task in list_tasks:
            people_in_charge = task.people_in_charge.all()
            for user in people_in_charge:
                if not TaskIndex.objects.filter(task=task, user=user).exists():
                    TaskIndex.update_max_index_for_user(
                        user=user, task=task, is_update=False
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded data with last index for Task."
            )
        )
