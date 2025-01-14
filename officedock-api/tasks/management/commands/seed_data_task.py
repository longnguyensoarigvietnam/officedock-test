from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
import random

from users.models import User
from tasks.models import Task, TaskIndex, TaskStatus
from tasks.constants import TaskPriorities, TaskTypes
from users.constants import RoleTypes


class Command(BaseCommand):
    help = "Seed fake data into Task"

    def add_arguments(self, parser):
        parser.add_argument(
            "total",
            type=int,
            help="Indicates the number of fake data to be generated",
        )
        parser.add_argument(
            "--user_id", type=int, help="Set id user to seed data Task."
        )
        parser.add_argument(
            "--email", type=str, help="Set email user to seed data Task."
        )
        parser.add_argument(
            "--title", type=str, help="Set title to seed data Task."
        )

    def handle(self, *args, **kwargs):
        total = kwargs.get("total")
        user_id = kwargs.get("user_id")
        email = kwargs.get("email")
        title = kwargs.get("title")

        if not total:
            self.stdout.write(self.style.ERROR("Total is required."))
            return

        # Fetch user if user_id is provided
        if email:
            user = (
                User.objects.filter(email=email)
                .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
                .first()
            )
            if not user:
                self.stdout.write(
                    self.style.ERROR(f"{email} does not exist. Try again.")
                )
                return

            # Seed data with imput email and title
            _seed_data_task(user, total, title)

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
            _seed_data_task(user, total, title)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into Task."
            )
        )


def _seed_data_task(user, total, title=None):
    """
    Seed tasks
    """
    fake = Faker()
    status = TaskStatus.objects.all()
    tz = timezone.get_current_timezone()
    company = user.company
    index = 1
    for _ in range(total):
        task = Task.objects.create(
            title=f"{title} {index}"
            if title
            else fake.sentence(nb_words=random.randint(4, 8)),
            type=TaskTypes.random(),
            status=random.choice(status),
            priority=TaskPriorities.random(),
            deadline=fake.date_time_between(
                start_date="now", end_date="+5d", tzinfo=tz
            ),
            plan_start_date=fake.date_time_between(
                start_date="-10d", end_date="now", tzinfo=tz
            ),
            plan_end_date=fake.date_time_between(
                start_date="now", end_date="+10d", tzinfo=tz
            ),
            actual_start_date=None,
            actual_end_date=None,
            description=fake.text(max_nb_chars=random.randint(100, 300)),
            company=company,
        )

        # Assign user if provided
        if user:
            task.people_in_charge.add(
                user, through_defaults={"company": company}
            )
            TaskIndex.objects.create(user=user, task=task)

        # Assign random tags
        tags = company.tags.all()
        tag = random.choice(tags)
        if tag:
            task.tags.add(tag, through_defaults={"company": company})

        # Increment index title
        index += 1
