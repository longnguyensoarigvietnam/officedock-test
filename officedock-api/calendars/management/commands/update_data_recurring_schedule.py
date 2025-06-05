from django.core.management import BaseCommand

from calendars.models import Schedule


class Command(BaseCommand):
    help = "Update recurring field of data schedule"

    def handle(self, *args, **kwargs):
        for schedule in Schedule.objects.filter(recurring__isnull=False).all():
            recurring = schedule.recurring
            if recurring.get("plan_start_date"):
                recurring["start_date"] = recurring.pop("plan_start_date")
            if recurring.get("plan_end_date"):
                recurring["end_date"] = recurring.pop("plan_end_date")
            schedule.recurring = recurring
            schedule.save()
