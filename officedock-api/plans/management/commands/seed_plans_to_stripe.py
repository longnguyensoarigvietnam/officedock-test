from django.core.management.base import BaseCommand
from common.services.stripe_service import StripeService
from plans.constants import CONSUMPTION_TAX, PLANS, TAX_PERCENTAGE
from plans.models import Plan


class Command(BaseCommand):
    help = "Seed the plan to Stripe"

    def handle(self, *args, **kwargs):
        stripe = StripeService()
        stripe.get_or_create_tax_rate(TAX_PERCENTAGE, CONSUMPTION_TAX)

        for plan in PLANS:
            stripe_product, stripe_price = stripe.create_product_with_price(
                name=plan["name"],
                amount=plan["monthly_fee"],
                currency="jpy",
                interval="month",
            )
            Plan.objects.update_or_create(
                name=plan["name"],
                defaults={
                    "monthly_fee": plan["monthly_fee"],
                    "stripe_product_id": stripe_product.id,
                    "stripe_price_id": stripe_price.id,
                    "exchangeable_amount": plan["exchangeable_amount"],
                },
            )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded plan to Stripe")
        )
