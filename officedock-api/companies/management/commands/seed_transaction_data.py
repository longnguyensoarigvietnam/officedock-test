from datetime import datetime
import random
from django.core.management.base import BaseCommand
from django.utils.timezone import timedelta

from companies.constants import CompanyTransactionTypes, TransactionStatus
from companies.models import Company, CompanyTransaction
from plans.models import Plan


class Command(BaseCommand):
    help = "Seed transaction data"

    def add_arguments(self, parser):
        parser.add_argument(
            "total",
            type=int,
            help="Indicates the number of fake data to be generated",
        )

    def handle(self, *args, **options):
        total = options["total"]
        for _ in range(total):
            trans_type = CompanyTransactionTypes.random()
            company = Company.objects.order_by("?").first()

            data = {}
            data["type"] = trans_type
            data["company"] = company
            # Generate a random number of days
            random_days = random.randint(0, 30)
            direction = random.choice([-1, 1])
            random_date = datetime.now() + timedelta(
                days=direction * random_days
            )
            if trans_type == CompanyTransactionTypes.PLAN.value:
                plan = Plan.objects.order_by("?").first()
                plan_start_at = random_date - timedelta(days=random_days)
                plan_end_at = random_date + timedelta(days=random_days)
                data["plan"] = plan
                data["plan_start_at"] = plan_start_at
                data["plan_end_at"] = plan_end_at
            elif trans_type == CompanyTransactionTypes.INVOICE.value:
                data["invoice_target"] = random_date
                data["status"] = TransactionStatus.random()
            else:
                data["paid_at"] = random_date
                data["amount_point"] = random.randint(1000, 100000)
            CompanyTransaction.objects.create(**data)
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {total} fake data into CompanyTransaction"
            )
        )
