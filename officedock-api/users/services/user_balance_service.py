from django.db import transaction
from django.utils import timezone

from companies.constants import CompanyStatus
from roles.constants import Screens, SelectionResultOptions
from users.constants import CurrencyEnums, TransactionTypes


class UserService:
    """
    User service related coin and balance of user
    """

    def expire_coin_lots(self, user, expire_date=None):
        """
        Expire user coin lots and reflect in UserBalance/TransactionHistory.
        """
        from users.models import TransactionHistory, UserBalance, UserCoinLot

        company = user.company
        expire_date = expire_date or timezone.now()

        with transaction.atomic():
            user_balance, _ = UserBalance.objects.get_or_create(
                user=user,
                company=company,
            )

            expired_lots = (
                UserCoinLot.objects.select_for_update()
                .filter(
                    user=user,
                    company=company,
                    amount_remaining__gt=0,
                    expires_at__lt=expire_date,
                )
                .order_by("expires_at", "id")
            )

            total_expired = 0
            to_update = []
            for lot in expired_lots:
                total_expired += lot.amount_remaining
                lot.amount_remaining = 0
                to_update.append(lot)

            if to_update:
                UserCoinLot.objects.bulk_update(to_update, ["amount_remaining"])

            if total_expired <= 0:
                return 0

            user_balance.coin = max((user_balance.coin or 0) - total_expired, 0)
            user_balance.save(update_fields=["coin"])

            TransactionHistory.objects.create(
                currency=CurrencyEnums.COIN.value,
                amount_used=total_expired,
                amount_received=0,
                balance_after=user_balance.coin,
                company_balance_after=company.coins_remaining,
                transaction_type=TransactionTypes.COIN_EXPIRE.value,
                memo="有効期限切れ",
                user=user,
                company_id=company.id,
            )
            return total_expired

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
        from users.models import TransactionHistory, UserBalance, UserCoinLot
        from users.utils import calculate_coin_expires_at

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
                # Consume COIN lots FIFO by nearest expiration
                if currency.lower() == "coin":
                    remaining = amount
                    lots = (
                        UserCoinLot.objects.select_for_update()
                        .filter(
                            user=user,
                            company=company,
                            amount_remaining__gt=0,
                        )
                        .order_by("expires_at", "granted_at", "id")
                    )
                    to_update = []
                    for lot in lots:
                        if remaining <= 0:
                            break
                        used = min(lot.amount_remaining, remaining)
                        lot.amount_remaining -= used
                        remaining -= used
                        to_update.append(lot)

                    if remaining > 0:
                        raise ValueError("Insufficient unexpired coin lots")

                    if to_update:
                        UserCoinLot.objects.bulk_update(
                            to_update, ["amount_remaining"]
                        )

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

                # Create COIN lot with expiration
                if currency.lower() == "coin" and amount > 0:
                    now_at = timezone.now()
                    UserCoinLot.objects.create(
                        user=user,
                        company=company,
                        amount_remaining=amount,
                        granted_at=now_at,
                        expires_at=calculate_coin_expires_at(now_at),
                    )

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
        # Just allow user have permission access to Payment Management page when company suspended
        if (
            company_status == CompanyStatus.SUSPENDED.value
            or company_status == CompanyStatus.RETRY_PAYMENT.value
        ):
            is_accept_login = user.roles.filter(
                permissions__name__startswith=Screens.PAYMENT_MANAGEMENT.value,
                role_details__selection_result=SelectionResultOptions.ALLOWED.value,
            ).exists()
            if company_status == CompanyStatus.RETRY_PAYMENT.value:
                return (
                    is_accept_login
                    if user.company.company_plan.stripe_subscription_id == None
                    else True
                )
            return is_accept_login
        return company_status not in [
            CompanyStatus.SUSPENDED.value,
            CompanyStatus.CONTRACT_TERMINATED.value,
            CompanyStatus.PENDING_APPROVAL.value,
        ]
