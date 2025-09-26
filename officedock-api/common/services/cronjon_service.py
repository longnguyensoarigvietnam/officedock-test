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
from plans.models import Tax
from users.models import UserBalance
from utils.mail import PaymentMailService


class CronJobService:
    def handle_cancel_the_invoice_of_company_temporary_usage(self, day):
        companies = Company.objects.filter(
            status=CompanyStatus.TEMPORARY_USAGE.value
        ).all()
        last_month = day - relativedelta(months=1)
        for company in companies:
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

    def handle_send_email_renewal_company_contract(self, day):
        if day.month == 12:
            start_year = day.year + 1
            start_month = 1
        else:
            start_year = day.year
            start_month = day.month + 1
        usage_month = datetime(start_year, start_month, 1, 0, 0, 0)
        if companies := Company.objects.filter(
            contract__next_renewal_at__date=usage_month.date()
        ).all():
            tax = Tax.objects.first()
            mail_service = PaymentMailService()
            for company in companies:
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

    def iterate_over_all_companies_to_closing(self, today):
        transaction_service = TransactionService()
        for company in Company.objects.all().prefetch_related("users"):
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
                if company_users_count > 0:
                    user_exchangeable_amount = (
                        company.exchangeable_amount // company_users_count
                    )
                    UserBalance.objects.filter(user__in=company_users).update(
                        exchangeable_coin=user_exchangeable_amount
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
