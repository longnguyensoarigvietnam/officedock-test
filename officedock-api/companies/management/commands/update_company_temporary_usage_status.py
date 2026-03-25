from django.core.management.base import BaseCommand, CommandError
from companies.models import Company
from companies.constants import (
    CompanyStatus,
    PaymentTypes,
)


class Command(BaseCommand):
    help = "Restore companies that were auto-cancelled in Stripe test mode"

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            help="Specific company ID to restore. If not provided, restores all matching companies.",
        )

    def handle(self, *args, **options):
        company_id = options.get("company_id")

        query = Company.objects.filter(
            status=CompanyStatus.CONTRACT_TERMINATED.value,
            payment_type=PaymentTypes.CREDIT_CARD.value,
            stripe_customer_id__isnull=False,
            contract__cancel_at__isnull=True,
            company_plan__stripe_subscription_id__isnull=True,
        )

        if company_id:
            query = query.filter(id=company_id)
            company = query.first()
            if not company:
                raise CommandError(
                    f"Company with id {company_id} not found or does not match criteria"
                )

            query.update(status=CompanyStatus.TEMPORARY_USAGE.value)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully restored company {company_id}. Status updated."
            )
        )
