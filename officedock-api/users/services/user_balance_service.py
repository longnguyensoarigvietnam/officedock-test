from django.db import transaction
from companies.constants import CompanyStatus
from roles.constants import Screens, SelectionResultOptions
from users.constants import TransactionTypes


class UserService:
    def update_balance(
        self, amount, transaction_type, user, memo, currency, operation="use"
    ):
        """
        Update user balance (coin or pearl) with transaction history

        Args:
            amount: Amount to add/use
            transaction_type: Type of transaction
            user: User instance
            memo: Transaction memo
            currency: CurrencyEnums.COIN or CurrencyEnums.PEARL
            operation: 'use' to subtract, 'receive' to add
        """
        from users.models import TransactionHistory, UserBalance

        company = user.company
        coins_remaining = company.coins_remaining

        with transaction.atomic():
            # Get or create user balance
            user_balance, created = UserBalance.objects.get_or_create(
                user=user,
                company=company,
            )

            # Determine field name and current balance
            field_name = currency.lower()  # 'coin' or 'pearl'
            current_balance = getattr(user_balance, field_name)

            # Check sufficient balance for 'use' operation
            if operation == "use" and current_balance < amount:
                raise ValueError(f"Inufficient {field_name} balance")

            # Update balance
            if operation == "use":
                if transaction_type == TransactionTypes.EXCHANGE.value:
                    user_balance.exchangeable_coin = max(
                        user_balance.exchangeable_coin - amount, 0
                    )
                    coins_remaining = max(coins_remaining - amount, 0)
                    company.coins_remaining = coins_remaining
                    company.save(update_fields=["coins_remaining"])

                new_balance = max(current_balance - amount, 0)
                amount_used = amount
                amount_received = 0
            else:  # 'receive'
                new_balance = current_balance + amount
                amount_used = 0
                amount_received = amount

            # Set new balance
            setattr(user_balance, field_name, new_balance)
            user_balance.save()

            # Create transaction history
            TransactionHistory.objects.create(
                currency=currency,
                amount_used=amount_used,
                amount_received=amount_received,
                balance_after=new_balance,
                company_balance_after=coins_remaining,
                transaction_type=transaction_type,
                memo=memo,
                user=user,
                company_id=user.company_id,
            )

            return new_balance

    def get_user_balance(self, user):
        """
        Get user's current balance
        """
        from users.models import UserBalance

        user_balance, created = UserBalance.objects.get_or_create(
            user=user,
            company_id=user.company_id,
        )
        return user_balance

    def check_valid_company(self, user):
        """
        Check status company of user.
        Return False when status deny access to system
        """
        if not user:
            return False
        company_status = user.company.status
        if not company_status:
            return False
        # Just allow user have permission access to Payment Management page when company suspended
        if company_status == CompanyStatus.SUSPENDED.value:
            return user.roles.filter(
                permissions__name__startswith=Screens.PAYMENT_MANAGEMENT.value,
                role_details__selection_result=SelectionResultOptions.ALLOWED.value,
            ).exists()
        return company_status not in [
            CompanyStatus.SUSPENDED.value,
            CompanyStatus.CONTRACT_TERMINATED.value,
            CompanyStatus.PENDING_APPROVAL.value,
        ]
