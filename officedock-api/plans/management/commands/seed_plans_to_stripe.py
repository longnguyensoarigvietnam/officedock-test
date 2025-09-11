from django.core.management.base import BaseCommand
from common.services.stripe_service import StripeService
from plans.constants import CONSUMPTION_TAX, PLANS, POSTPAID, TAX_PERCENTAGE
from plans.models import Plan


class Command(BaseCommand):
    help = "Seed the plan to Stripe"

    def handle(self, *args, **kwargs):
        stripe = StripeService()

        if Plan.objects.exists():
            return
        stripe_tax_id = stripe.get_or_create_tax_rate(
            TAX_PERCENTAGE, CONSUMPTION_TAX
        )
        stripe_meter_id = stripe.get_or_create_meter(
            display_name=POSTPAID,
            event_name="monthly_usage",
            default_aggregation={"formula": "sum"},
        )
        for plan in PLANS:
            stripe_product, stripe_price = stripe.create_product_with_price(
                name=plan["name"],
                amount=plan["monthly_fee"],
                currency="jpy",
                interval="month",
                meter_id=stripe_meter_id,
            )
            Plan.objects.create(
                name=plan["name"],
                monthly_fee=plan["monthly_fee"],
                stripe_product_id=stripe_product.id,
                stripe_price_id=stripe_price.id,
                exchangeable_amount=plan["exchangeable_amount"],
            )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded plan to Stripe")
        )
