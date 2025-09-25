from datetime import datetime
from decimal import Decimal

import stripe
from common.constants import InvoiceReason
from common.utils import get_a_day_in_next_month
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    TransactionStatus,
)
from companies.models import Company, CompanyTransaction
from core import settings
from base.messages import ERROR_MESSAGES
from rest_framework.exceptions import ValidationError

from plans.models import Tax


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
                "interval": interval,
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
        customers = stripe.Customer.search(
            query=f"name:'{company.name}' AND metadata['company_id']:'{company.id}'"
        )
        if customers:
            ids = [customer["id"] for customer in customers["data"]]

            company.stripe_customer_id = ids[0]
            company.save(update_fields=["stripe_customer_id"])
            return ids[0]

        new_customer = stripe.Customer.create(
            name=company.name,
            email=company.contract.responsible_person_mail,
            metadata={"company_id": str(company.id)},
        )
        company.stripe_customer_id = new_customer.id
        company.save(update_fields=["stripe_customer_id"])

        return new_customer.id

    def update_customer(self, company: Company):
        """Update a Stripe customer with the latest company information."""
        if not company.stripe_customer_id:
            return
        stripe.Customer.modify(
            company.stripe_customer_id,
            name=company.name,
            email=company.contract.responsible_person_mail,
        )

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
            if company_plan.stripe_subscription_id:
                stripe_subs = stripe.Subscription.retrieve(
                    company_plan.stripe_subscription_id
                )
                if stripe_subs:
                    return stripe_subs
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
                billing_cycle_anchor_config={
                    "day_of_month": 1,
                    "hour": 0,
                    "minute": 0,
                },
                proration_behavior="none",  # No prorate for current month
                collection_method="charge_automatically",
                metadata={"company_id": company.id},
            )

            return subscription

        except stripe.error.CardError as e:
            raise ValidationError({"detail": f"{ERROR_MESSAGES['card_error']}"})
        except stripe.error.StripeError as e:
            raise ValidationError({"detail": f"{e}"})
        except Exception as e:
            raise ValidationError({"detail": f"{e}"})

    def handle_invoice_created(self, invoice):
        """
        Handle logic when an invoice is created:
        - Set the due date to the 5th of the next month.
        - Update invoice with due date and default payment method.
        """
        if invoice.billing_reason != InvoiceReason.SUBSCRIPTION_CYCLE.value:
            return  # Only process invoices tied to subscriptions

        try:
            # Get the company's default payment method
            company = Company.objects.filter(
                stripe_customer_id=invoice.customer
            ).first()
            self.update_invoice_finalize(invoice, company)
            CompanyTransaction.objects.create(
                company=company,
                type=CompanyTransactionTypes.INVOICE.value,
                status=TransactionStatus.UNPAID.value,
                invoice_target=datetime.fromtimestamp(invoice.created),
                stripe_invoice_id=invoice.id,
            )
            print(f"Invoice created: {invoice.id}")

        except Exception as e:
            print(f"❌ Invoice create failed: {e}")
            raise ValidationError({"detail": f"{e}"})

    def update_invoice_finalize(self, invoice, company):
        """
        Set the finalize of invoice to the 5th of the next month.
        """
        # Convert period_end (UNIX timestamp) to datetime
        period_end_dt = datetime.fromtimestamp(invoice.period_end)
        finalizes_at = int(
            get_a_day_in_next_month(
                date=period_end_dt, target_date=5
            ).timestamp()
        )
        if company and company.status != CompanyStatus.TEMPORARY_USAGE.value:
            # Update the invoice on Stripe
            stripe.Invoice.modify(
                invoice.id,
                automatically_finalizes_at=finalizes_at,
                auto_advance=True,
            )
        else:
            # Update the invoice on Stripe
            stripe.Invoice.modify(
                invoice.id,
                auto_advance=False,
            )

    def handle_pay_invoice(self, invoice):
        """
        Attempt to pay the given invoice using Stripe.

        - If the company is in TEMPORARY_USAGE status, mark the invoice as paid out-of-band
        (i.e., outside of Stripe’s normal payment flow).
        - Otherwise, Stripe attempts to charge the default payment method.

        Args:
            invoice (stripe.Invoice): The invoice object returned from Stripe.

        Raises:
            ValidationError: If the payment request to Stripe fails.
        """
        try:
            # Check if the company should skip automatic payment
            is_skip_payment = Company.objects.filter(
                stripe_customer_id=invoice.customer,
                status=CompanyStatus.TEMPORARY_USAGE.value,
            ).exists()
            # Pay the invoice via Stripe
            if is_skip_payment:
                # Update transaction status
                CompanyTransaction.objects.filter(
                    stripe_invoice_id=invoice.id
                ).update(status=TransactionStatus.SKIP_PAYMENT.value)
                stripe.Invoice.void_invoice(invoice.id)
        except Exception as e:
            # Wrap Stripe error (or any other) into a DRF ValidationError
            print(f"❌ Pay invoice failed {e}")
            raise ValidationError({"detail": str(e)})

    def handle_cancel_subscription(self, subscription_id, cancel_at):
        """Cancel a Stripe subscription either at a specific date or at the period end."""
        try:
            if cancel_at:
                subscription = stripe.Subscription.modify(
                    subscription_id, cancel_at=cancel_at
                )
            else:
                subscription = stripe.Subscription.modify(
                    subscription_id, cancel_at_period_end=True
                )
        except Exception as e:
            # Wrap Stripe error (or any other) into a DRF ValidationError
            print(f"❌ Cancel subscription: {e}")
            raise ValidationError({"detail": str(e)})
        except stripe.error.StripeError as e:
            print(f"❌ Cancel subscription from Stripe: {e}")
            raise ValidationError({"detail": f"{e}"})
        return True

    def get_invoice(self, invoice_id):
        """Retrieve a Stripe invoice by ID."""
        try:
            return stripe.Invoice.retrieve(invoice_id)
        except stripe.error.StripeError as e:
            return False

    def finalize_invoice(self, invoice_id):
        """Finalize a Stripe invoice."""
        try:
            return stripe.Invoice.finalize_invoice(invoice_id)
        except stripe.error.StripeError as e:
            return False
