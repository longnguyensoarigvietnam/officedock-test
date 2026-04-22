from django.core.management import BaseCommand

from tasks.models import Task


class Command(BaseCommand):
    help = "Clear task have empty participant"

    def handle(self, *args, **kwargs):
        list_tasks = Task.objects.all()

        for task in list_tasks:
            if task.people_in_charge.count() == 0:
                task.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully clear task have empty participant"
            )
        )
