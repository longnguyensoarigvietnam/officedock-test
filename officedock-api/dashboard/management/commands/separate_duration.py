from django.core.management import BaseCommand

from dashboard.utils import separate_duration
from tasks.models import TaskDuration


class Command(BaseCommand):
    help = "Split time range by day and create new duration for it"

    def handle(self, *args, **options):
        """
        Handle command
        """
        durations = TaskDuration.objects.filter(paused_at__isnull=False).all()
        for duration in durations:
            separate_duration(duration, duration.paused_at)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully separate duration for {durations.count()} record."
            )
        )
