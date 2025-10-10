from datetime import datetime
from dateutil.relativedelta import relativedelta
from common.services import stripe_service
from common.services.transaction_service import TransactionService
from common.utils import calculate_company_dates, format_date
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    TransactionStatus,
)
from companies.models import Company, CompanyTransaction
from companies.services import CompanyService
from plans.models import Tax
from users.models import TransactionHistory, UserBalance
from users.constants import CurrencyEnums, TransactionTypes
from utils.mail import PaymentMailService


class CronJobService:
    def handle_cancel_the_invoice_of_company_temporary_usage(
        self, day, companies=None
    ):
        if not companies:
            companies = Company.objects.all()

        last_month = day - relativedelta(months=1)
        for company in companies.filter(
            status=CompanyStatus.TEMPORARY_USAGE.value
        ):
            invoices = CompanyTransaction.objects.filter(
                company=company,
                paid_at__isnull=True,
                type=CompanyTransactionTypes.INVOICE.value,
                status=TransactionStatus.UNPAID.value,
            ).all()
            for invoice in invoices:
                if invoice.invoice_target.month == last_month.month:
                    stripe_service.StripeService().finalize_invoice(
                        invoice.stripe_invoice_id
                    )

    def handle_send_email_renewal_company_contract(self, day, companies=None):
        if day.month == 12:
            start_year = day.year + 1
            start_month = 1
        else:
            start_year = day.year
            start_month = day.month + 1
        usage_month = datetime(start_year, start_month, 1, 0, 0, 0)
        if not companies:
            companies = Company.objects.all()

        if companies:
            tax = Tax.objects.first()
            mail_service = PaymentMailService()
            for company in companies.filter(
                contract__next_renewal_at__date=usage_month.date()
            ):
                plan = company.company_plan.plan
                price = plan.monthly_fee + (
                    plan.monthly_fee * tax.percentage / 100
                )
                mail_service.send_contract_renewal_notice(
                    renewal_date=format_date(usage_month, style="jp_date"),
                    company_name=company.name,
                    responsible_name=company.responsible_person_name,
                    recipient=company.responsible_person_mail,
                    plan=plan.name,
                    price=format(int(price), ","),
                )

    def iterate_over_all_companies_to_closing(self, today, companies=None):
        if not companies:
            companies = Company.objects.all()

        transaction_service = TransactionService()
        for company in companies.prefetch_related("users"):
            company_dates = calculate_company_dates(company, today)
            date_after_closing = company_dates["date_after_closing"]
            start_date_calculation_deadline = company_dates[
                "start_date_calculation_deadline"
            ]
            date_after_data_edit_deadline = company_dates[
                "date_after_data_edit_deadline"
            ]

            # --- Case 1: Closing day ---
            if today.day == date_after_closing.day:
                company_users = company.users.all()
                company_users_count = company_users.count()

                # Update exchangeable coin for user
                user_exchangeable_amount = 0
                exchangeable_amount = company.exchangeable_amount
                if company_users_count > 0:
                    user_exchangeable_amount = (
                        exchangeable_amount // company_users_count
                    )

                data_to_create = []
                # Reset coin
                data_to_create.append(
                    TransactionHistory(
                        currency=CurrencyEnums.COIN.value,
                        amount_used=company.coins_remaining,
                        amount_received=0,
                        company_balance_after=0,
                        transaction_type=TransactionTypes.PLAN_AUTO_EXPIRE.value,
                        memo=TransactionTypes.PLAN_AUTO_EXPIRE.value,
                        company=company,
                    )
                )

                # Receive coin
                data_to_create.append(
                    TransactionHistory(
                        currency=CurrencyEnums.COIN.value,
                        amount_used=0,
                        amount_received=exchangeable_amount,
                        company_balance_after=exchangeable_amount,
                        transaction_type=TransactionTypes.PLAN_AUTO.value,
                        memo=TransactionTypes.PLAN_AUTO.value,
                        company=company,
                    )
                )
                TransactionHistory.objects.bulk_create(data_to_create)

                # Update company balance after creating transaction history
                company.total_coins = exchangeable_amount
                company.coins_remaining = exchangeable_amount
                company.target_user_count = company_users_count
                company.save(
                    update_fields=[
                        "total_coins",
                        "coins_remaining",
                        "target_user_count",
                    ]
                )

                for user in company_users:
                    # Reward coins for thanks messages (top voted)
                    transaction_service.reward_thanks_message(
                        user,
                        date_after_closing,
                        start_date_calculation_deadline,
                    )

                    # Reward pearls
                    transaction_service.reward_login_bonus(
                        user,
                        date_after_closing,
                        start_date_calculation_deadline,
                    )
                    transaction_service.reward_task_complete(
                        user,
                        date_after_closing,
                        start_date_calculation_deadline,
                    )

                    # Update exchangeable coin for user
                    if user_balance := UserBalance.objects.filter(
                        user=user
                    ).first():
                        user_balance.exchangeable_coin = (
                            user_exchangeable_amount
                        )
                        user_balance.save(update_fields=["exchangeable_coin"])
                    else:
                        UserBalance.objects.create(
                            company=company,
                            user=user,
                            exchangeable_coin=user_exchangeable_amount,
                        )

            # --- Case 2: Deadline day ---
            elif today.day == date_after_data_edit_deadline.day:
                # Process working time rewards for all users in the company
                # This runs at 00:00 of the day after the deadline
                # Get all users in the company
                company_users = company.users.all()

                # Process working time rewards for each user for the entire month
                for user in company_users:
                    # Calculate total working time rewards for the entire month
                    transaction_service.reward_actual_working_time(
                        start_date_calculation_deadline,
                        date_after_closing,
                        user,
                    )

    def handle_downgrade_plan_after_renewal_contract(self, today):
        """
        Handle automatic plan downgrades for companies on their contract renewal date.

        This method:
            1. Finds all active or temporary-use companies whose `next_renewal_at` date is today.
            2. For each company, checks whether a downgrade is required based on user count.
            3. Performs the downgrade process safely with transaction control and logging.

        Args:
            today (date, required): The date to check for renewals.
        """
        companies = Company.objects.filter(
            contract__next_renewal_at__date=today,
            status__in=[
                CompanyStatus.ACTIVE_CONTRACT.value,
                CompanyStatus.TEMPORARY_USAGE.value,
            ],
        ).all()
        if companies:
            for company in companies:
                CompanyService().downgrade_plan(company, today)
