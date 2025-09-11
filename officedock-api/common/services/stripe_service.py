from decimal import Decimal

import stripe
from companies.models import Company
from core import settings
from base.messages import ERROR_MESSAGES
from rest_framework.exceptions import ValidationError

from plans.models import Meter, Tax


def set_stripe_key():
    """
    Set the Stripe secret API key from Django settings.
    This should be called before using any Stripe API functions.
    """
    stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    def __init__(self):
        """
        Initialize the Stripe service by setting the Stripe secret API key.
        """
        set_stripe_key()

    def get_or_create_meter(
        self, display_name, event_name, default_aggregation
    ):
        """
        Get or create a Meter in Stripe.

        If an active Meter with the same display_name and event_name exists,
        return its ID. Otherwise, create a new Meter with the given parameters.

        Arguments:
            display_name (str): Human-readable name for the meter.
            event_name (str): The event name used when reporting usage.
            default_aggregation (dict): Aggregation settings, e.g. {"mode": "sum", "field_name": "value"}.

        Returns:
            str: Stripe Meter ID
        """
        # 1. Try to find existing meter
        meter = Meter.objects.filter(
            display_name=display_name, event_name=event_name
        ).first()
        if meter:
            return meter.stripe_meter_id

        # 2. Otherwise, create a new meter
        new_meter = stripe.billing.Meter.create(
            display_name=display_name,
            event_name=event_name,
            default_aggregation=default_aggregation,
        )
        Meter.objects.create(
            display_name=display_name,
            event_name=event_name,
            stripe_meter_id=new_meter.id,
        )
        return new_meter.id

    def get_or_create_tax_rate(self, percentage, tax_name):
        """
        Get or create a TaxRate in Stripe with a fixed tax rate.
        If an active TaxRate with the same percentage exists, return that id.

        Arguments:
        % (float): Tax rate percentage.

        Returns:
        str: Stripe tax rate ID
        """

        # Convert decimal -> float
        if isinstance(percentage, Decimal):
            percentage = float(percentage)

        # 1. Get active tax from DB
        tax_rate = Tax.objects.filter(
            percentage=percentage, name=tax_name
        ).first()
        if tax_rate:
            return tax_rate.stripe_tax_id

        # 2. If not yet → create new
        new_tax = stripe.TaxRate.create(
            display_name=tax_name,
            percentage=percentage,
            inclusive=False,  # Taxes added, not included in price
            description=f"{percentage}% 税率",
        )
        Tax.objects.create(
            name=tax_name,
            percentage=percentage,
            stripe_tax_id=new_tax.id,
        )
        return new_tax.id

    def create_product_with_price(
        self, name, amount, currency, interval=None, meter_id=None
    ):
        """
        Create a Stripe product and its associated price.

        Args:
            name (str): Name of the product (e.g. "Pro Plan", "Lite Plan")
            amount (int): Price amount in the smallest currency unit (e.g. 1000 = ¥1,000)
            currency (str): Currency code (e.g. "jpy", "usd")
            interval (str, optional): Billing interval for recurring price (e.g. "month", "year").
                                    If None, creates a one-time price.

        Returns:
            tuple: A tuple containing:
                - stripe.Product: The created product object
                - stripe.Price: The created price object
        """
        product = stripe.Product.create(name=name)

        price_data = {
            "unit_amount": amount,
            "currency": currency,
            "product": product.id,
            "recurring": {
                "usage_type": "metered",  # For postpaid
                "interval": interval,
                "meter": meter_id,
            },
            "billing_scheme": "per_unit",
        }
        price = stripe.Price.create(**price_data)

        return product, price

    def get_or_create_customer(self, company: Company):
        """
        Get or create a Stripe customer for the company.

        Args:
            company (Company): The company instance to get or create customer for.

        Returns:
            str: The Stripe customer ID.
        """
        if company.stripe_customer_id:
            return company.stripe_customer_id

        customer = stripe.Customer.create(
            name=company.name,
            email=company.contract.responsible_person_mail,
            metadata={"company_id": str(company.id)},
        )
        company.stripe_customer_id = customer.id
        company.save(update_fields=["stripe_customer_id"])

        return customer.id

    def attach_payment_method_to_customer(
        self, company: Company, payment_method_id: str, is_create_company=False
    ) -> dict:
        """
        Attach a payment method to a customer. Create customer if not exists.

        Returns:
            dict: card_info (last4, exp_month, exp_year, brand, is_default)
        """
        try:
            # 1. Retrieve card info first
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            fingerprint = payment_method.card.fingerprint

            # 2. Check if this card already exists for this company
            if company.payment_methods.filter(
                stripe_fingerprint=fingerprint
            ).exists():
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["card_already_exists"]}
                )

            # 3. Get customer id
            customer_id = company.stripe_customer_id
            if not customer_id:
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["stripe_customer_id_missing"]}
                )

            # 4. Attach payment method
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )

            # 5. Set default if it's the first one
            is_default = not company.payment_methods.exists()
            if is_default:
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={
                        "default_payment_method": payment_method_id
                    },
                )

            return {
                "last4": payment_method.card.last4,
                "exp_month": payment_method.card.exp_month,
                "exp_year": payment_method.card.exp_year,
                "brand": payment_method.card.brand,
                "fingerprint": payment_method.card.fingerprint,
                "is_default": is_default,
                "cardholder_name": payment_method.billing_details.name,
            }
        except stripe.CardError:
            # Stripe declined for card-side reasons
            raise ValidationError({"detail": ERROR_MESSAGES["card_declined"]})
        except stripe.error.StripeError as e:
            # Delete Stripe customer if attaching a card fails during company creation
            if is_create_company:
                stripe.Customer.delete(company.stripe_customer_id)
            # Other errors from Stripe (connection, authentication...)
            raise ValidationError(
                {"detail": f"{e.user_message or 'Unknown error'}"}
            )

    def create_postpaid_subscription_with_invoice(
        self, company: Company, start_date
    ):
        """
        Create a postpaid (metered billing) subscription for the given company.
        The usage cycle starts from `start_date` (day 01) until the end of the month.
        An invoice will be generated at the end of the cycle and is due on the 5th
        of the following month.

        Args:
            company (Company): The company for which to create the subscription.
            start_date (int): The billing cycle anchor (Unix timestamp), e.g., 01/09.

        Returns:
            stripe.Subscription: The created Stripe subscription object.
        """
        try:
            customer_id = company.stripe_customer_id
            if not customer_id:
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["stripe_customer_id_missing"]}
                )
            company_plan = company.plan
            price = stripe.Price.retrieve(company_plan.plan.stripe_price_id)

            # Create fixed subscription billing at the end of the month
            tax = Tax.objects.first()
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[
                    {
                        "price": price.id,
                        "tax_rates": [tax.stripe_tax_id] if tax else [],
                    }
                ],
                billing_cycle_anchor=start_date,  # Start date in contract
                proration_behavior="none",  # No prorate for current month
                collection_method="send_invoice",
                days_until_due=5,  # Invoice will be send at day 5 of month
                metadata={"company_id": company.id},
            )
            return subscription

        except stripe.error.CardError as e:
            raise ValidationError({"detail": f"{ERROR_MESSAGES['card_error']}"})
        except stripe.error.StripeError as e:
            raise ValidationError({"detail": f"{e}"})
        except Exception:
            raise ValidationError(
                {"detail": f"{ERROR_MESSAGES['payment_failed']}"}
            )
