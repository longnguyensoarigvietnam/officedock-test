from datetime import datetime
from decimal import Decimal

import stripe
from common.constants import InvoiceReason
from common.utils import get_a_day_in_next_month
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    PaymentTypes,
    TransactionStatus,
)
from companies.models import Company, CompanyPlan, CompanyTransaction
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
        try:
            if stripe.TaxRate.retrieve(tax_rate.stripe_tax_id):
                return tax_rate.stripe_tax_id
        except Exception:
            # 2. If not yet → create new
            new_tax = stripe.TaxRate.create(
                display_name=tax_name,
                percentage=percentage,
                inclusive=False,  # Taxes added, not included in price
                description=f"{percentage}% 税率",
            )
            if tax_rate:
                tax_rate.stripe_tax_id = new_tax.id
                tax_rate.save()
            else:
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

    def get_customer(self, company: Company):
        """Get a Stripe customer"""
        try:
            return stripe.Customer.retrieve(company.stripe_customer_id)
        except stripe.error.StripeError as e:
            company.stripe_customer_id = None
            company.save(update_fields=["stripe_customer_id"])
            return False

    def get_or_create_customer(self, company: Company):
        """
        Get or create a Stripe customer for the company.

        Args:
            company (Company): The company instance to get or create customer for.

        Returns:
            str: The Stripe customer ID.
        """
        customer = self.get_customer(company)
        if customer:
            if customer.get("deleted"):
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["cannot_updated"]}
                )
            return customer.id

        new_customer = stripe.Customer.create(
            name=company.name,
            email=company.responsible_person_mail,
            metadata={"company_id": str(company.id)},
        )
        company.stripe_customer_id = new_customer.id
        company.save(update_fields=["stripe_customer_id"])

        return new_customer.id

    def update_customer(self, company: Company):
        """Update a Stripe customer with the latest company information."""
        if not company.stripe_customer_id:
            return
        customer_id = self.get_or_create_customer(company)
        stripe.Customer.modify(
            customer_id,
            name=company.name,
            email=company.responsible_person_mail,
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
            is_default = not company.payment_methods.filter(
                type=PaymentTypes.CREDIT_CARD.value
            ).exists()
            if is_default:
                self.modify_default_payment_method(
                    customer_id, payment_method_id
                )

            return {
                "last4": payment_method.card.last4,
                "exp_month": payment_method.card.exp_month,
                "exp_year": payment_method.card.exp_year,
                "brand": payment_method.card.brand,
                "stripe_fingerprint": payment_method.card.fingerprint,
                "is_default": is_default,
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

    def create_postpaid_subscription_with_invoice(self, company: Company):
        """
        Create a postpaid (metered billing) subscription for the given company.
        The usage cycle starts from (day 01) until the end of the month.
        An invoice will be generated at the end of the cycle and is due on the 5th
        of the following month.

        Args:
            company (Company): The company for which to create the subscription.

        Returns:
            stripe.Subscription: The created Stripe subscription object.
        """
        try:
            customer_id = company.stripe_customer_id
            if not customer_id:
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["stripe_customer_id_missing"]}
                )
            company_plan = company.company_plan
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

    def handle_pay_invoice(self, invoice, payment_method_id=None):
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
            metadata = invoice.get("metadata", {})
            # Pay the invoice via Stripe
            if is_skip_payment or metadata.get("voided") == "true":
                # Update transaction status
                CompanyTransaction.objects.filter(
                    stripe_invoice_id=invoice.id
                ).update(status=TransactionStatus.SKIP_PAYMENT.value)
                stripe.Invoice.void_invoice(invoice.id)
            elif payment_method_id:
                stripe.Invoice.pay(invoice.id, payment_method=payment_method_id)
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

    def change_price_of_subscription(self, company, plan):
        """
        Change the price of an existing Stripe subscription for a company.

        Args:
            company (Company): The company whose subscription will be updated.
            plan (Plan): The new plan containing the Stripe price ID.

        Returns:
            dict: The updated Stripe subscription object.

        Raises:
            ValidationError: If the customer, plan, or subscription is invalid, or if Stripe raises an error.
        """
        try:
            customer_id = company.stripe_customer_id
            if not customer_id:
                raise ValidationError(
                    {"detail": ERROR_MESSAGES["stripe_customer_id_missing"]}
                )
            company_plan = company.company_plan
            price = stripe.Price.retrieve(plan.stripe_price_id)
            stripe_subs = self.retrieve_subscription(
                company_plan.stripe_subscription_id
            )

            if stripe_subs and price:
                subscription_item_id = stripe_subs["items"]["data"][0]["id"]
                # Create fixed subscription billing at the end of the month
                subscription = stripe.Subscription.modify(
                    stripe_subs.id,
                    items=[
                        {
                            "id": subscription_item_id,
                            "price": price,
                        }
                    ],
                    proration_behavior="none",  # No prorate for current month
                )

            return True

        except stripe.error.CardError as e:
            raise ValidationError({"detail": f"{ERROR_MESSAGES['card_error']}"})
        except stripe.error.StripeError as e:
            raise ValidationError({"detail": f"{e}"})
        except Exception as e:
            raise ValidationError({"detail": f"{e}"})

    def retrieve_subscription(self, stripe_subscription_id):
        """
        Retrieve a subscription from Stripe.

        Args:
            stripe_subscription_id (str): The Stripe subscription ID.

        Returns:
            dict | None: The subscription object if found, otherwise None.

        Side effects:
            - If the subscription cannot be retrieved (e.g., deleted in Stripe),
            the local CompanyPlan.stripe_subscription_id will be cleared.
        """
        try:
            if not stripe_subscription_id:
                return None
            stripe_subs = stripe.Subscription.retrieve(stripe_subscription_id)
            return stripe_subs
        except stripe.error.InvalidRequestError as e:
            # Subscription not found on Stripe → clean up local DB
            CompanyPlan.objects.filter(
                stripe_subscription_id=stripe_subscription_id
            ).update(stripe_subscription_id=None)
            return None

        except stripe.error.StripeError as e:
            # Other Stripe-related errors (API, auth, rate limits, etc.)
            raise ValidationError(
                {"detail": e.user_message or "Unable to retrieve subscription"}
            )
        except Exception as e:
            # Unexpected system-level errors
            raise ValidationError({"detail": str(e)})

    def modify_default_payment_method(
        self, stripe_customer_id, payment_method_id
    ):
        """
        Update the default payment method for a Stripe customer.

        Args:
            stripe_customer_id (str): The ID of the Stripe customer.
            payment_method_id (str): The ID of the payment method to set as default.

        Returns:
            dict: The updated Stripe customer object.

        Raises:
            ValidationError: If the card is declined or Stripe returns an error.
        """
        try:
            stripe.Customer.modify(
                stripe_customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )
        except stripe.CardError:
            # Stripe declined for card-side reasons
            raise ValidationError({"detail": ERROR_MESSAGES["card_declined"]})
        except stripe.error.StripeError as e:
            # Other errors from Stripe (connection, authentication...)
            raise ValidationError(
                {"detail": f"{e.user_message or 'Unknown error'}"}
            )

    def detach_payment_method(self, payment_method_id):
        """Detach a payment method from a Stripe customer."""
        try:
            stripe.PaymentMethod.detach(payment_method_id)
        except stripe.CardError as e:
            # Stripe declined for card-side reasons
            raise ValidationError({"detail": e.message})
        except stripe.error.StripeError as e:
            # Other errors from Stripe (connection, authentication...)
            raise ValidationError(
                {"detail": f"{e.user_message or 'Unknown error'}"}
            )

    def replace_invoice_subscription(self, company, plan):
        """
        Create and replace an invoice for a company in Stripe and local DB.

        Steps:
        1. Retrieve the current unpaid invoice for the company.
        2. Void the existing Stripe invoice (if any).
        3. Create a new invoice with updated plan and tax info.
        4. Attach line items for billing.
        5. Update the local CompanyTransaction record.
        """
        try:
            tax = Tax.objects.first()
            customer_id = company.stripe_customer_id
            # Get current invoice unpaid
            current_local_invoice = CompanyTransaction.objects.filter(
                company=company,
                paid_at__isnull=True,
                type=CompanyTransactionTypes.INVOICE.value,
                status=TransactionStatus.UNPAID.value,
            ).last()
            if not current_local_invoice:
                return
            subscription_invoice = self.get_invoice(
                current_local_invoice.stripe_invoice_id
            )
            # Void the old invoice safely
            finalizes_at = int(
                get_a_day_in_next_month(
                    date=current_local_invoice.invoice_target, target_date=5
                ).timestamp()
            )
            # Update invoice with metadata, and turn off automatic payment
            stripe.Invoice.modify(
                current_local_invoice.stripe_invoice_id,
                metadata={"voided": "true"},
                auto_advance=False,
            )
            # Finalize invoice
            self.finalize_invoice(current_local_invoice.stripe_invoice_id)
            # Create a new invoice
            new_invoice = stripe.Invoice.create(
                customer=customer_id,
                auto_advance=True,
                automatically_finalizes_at=finalizes_at,
                currency="jpy",
            )
            # Update current transaction
            CompanyTransaction.objects.filter(
                id=current_local_invoice.id
            ).update(
                status=TransactionStatus.UNPAID.value,
                stripe_invoice_id=new_invoice.id,
            )
            line = subscription_invoice.lines.data[0]
            # Create line items
            line_items = [
                {
                    "amount": int(plan.monthly_fee),  # subtotal
                    "currency": "jpy",
                    "description": f"1 × {plan.name} (at ¥{int(plan.monthly_fee)}/ month)",
                    "tax_rates": [tax.stripe_tax_id],
                    "period": {
                        "start": line.period.start,
                        "end": line.period.end,
                    },
                }
            ]

            for item in line_items:
                stripe.InvoiceItem.create(
                    customer=customer_id,
                    invoice=new_invoice.id,
                    amount=item["amount"],
                    currency=item["currency"],
                    description=item["description"],
                    tax_rates=item["tax_rates"],
                    period=item["period"],
                )
            if company.status == CompanyStatus.TEMPORARY_USAGE.value:
                self.update_invoice_finalize(new_invoice, company)

            return self.get_invoice(new_invoice.id)

        except stripe.error.StripeError as e:
            raise ValidationError(e)
        except Exception as e:
            raise ValidationError(e)
