from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
import random

from calendars.constants import ScheduleTypes
from calendars.models import Schedule
from users.models import User


class Command(BaseCommand):
    help = "Seed fake data into Schedule"

    def add_arguments(self, parser):
        parser.add_argument(
            "total",
            type=int,
            help="Indicates the number of fake data to be generated",
        )
        parser.add_argument(
            "--user_id", type=int, help="Set id user to seed data Schedule."
        )

    def handle(self, *args, **kwargs):
        total = kwargs.get("total")
        user_id = kwargs.get("user_id")

        if not total:
            self.stdout.write(self.style.ERROR("Total is required."))
            return

        if user_id:
            user = User.objects.filter(id=user_id).first()
            if not user:
                self.stdout.write(
                    self.style.ERROR(
                        f"User id {user_id} does not exist. Try again."
                    )
                )
                return

            # Seed data with imput user id and title
            _seed_data_schedule(user, total)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into Schedule."
            )
        )


def _seed_data_schedule(user, total, title=None):
    """
    Seed schedules
    """
    fake = Faker()
    tz = timezone.get_current_timezone()
    company = user.company

    for _ in range(total):
        schedule = Schedule.objects.create(
            title=f"{title} {user.id}"
            if title
            else fake.sentence(nb_words=random.randint(4, 8)),
            type=ScheduleTypes.random(),
            start_date=fake.date_time_between(
                start_date="-10d", end_date="now", tzinfo=tz
            ),
            end_date=fake.date_time_between(
                start_date="now", end_date="+35d", tzinfo=tz
            ),
            memo=fake.sentence(nb_words=random.randint(4, 20)),
            company=company,
        )

        # Assign user if provided
        if user:
            schedule.participants.add(
                user, through_defaults={"company": company}
            )

        # Assign random tags
        tags = company.tags.all()
        tag = random.choice(tags)
        if tag:
            schedule.tags.add(tag, through_defaults={"company": company})
