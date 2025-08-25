from datetime import datetime, timedelta
import random
from faker import Faker
from django.core.management.base import BaseCommand
from companies.models import Company
from mvp_votes.models import MVPVoteManagement


class Command(BaseCommand):
    help = "Seed fake data into Mvp Vote"

    def add_arguments(self, parser):
        parser.add_argument(
            "total",
            type=int,
            default=100,
            help="Number of MVP votes to create",
        )

    def handle(self, *args, **kwargs):
        fake = Faker()
        total = kwargs["total"]
        MVPVoteManagement.objects.all().delete()
        # Seed Votes
        companies = Company.objects.all()
        for company in companies:
            candidates = company.users.all()
            for _ in range(total):
                # Set the range for the random date
                now = datetime.now()
                # Generate a random number of days
                random_days = random.randint(0, 30)
                start_range = now - timedelta(days=random_days)
                end_range = now + timedelta(days=random_days)
                mvp_vote = MVPVoteManagement.objects.create(
                    company=company,
                    start_date=start_range,
                    end_date=end_range,
                    created_by=company.users.order_by("?").first(),
                    title=fake.text(),
                    bonus_point=random.randint(200, 1000),
                )
                random_candidate = random.randint(0, 15)
                selected_candidates = (
                    candidates[:random_candidate]
                    if random_candidate != 0
                    else candidates
                )
                for candidate in selected_candidates:
                    mvp_vote.candidates.add(
                        candidate, through_defaults={"company": company}
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into Mvp vote"
            )
        )
