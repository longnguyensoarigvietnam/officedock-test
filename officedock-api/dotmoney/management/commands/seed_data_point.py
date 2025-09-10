import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from users.models import User, UserBalance
from users.constants import (
    TransactionTypes,
    COIN_VOTE_MVP,
    COIN_THANKS_MSG,
    COIN_WORK_TIME,
    COIN_SKILL_UP_STEP1,
    COIN_SKILL_UP_STEP2,
    COIN_SKILL_UP_STEP3,
    PEARL_TASK_COMPLETE,
    PEARL_LOGIN_BONUS,
)


class Command(BaseCommand):
    help = "Seed point data for the last 2 months for testing and checking."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=int,
            help="User ID to create data for (if not provided, uses first user)",
        )

    def handle(self, *args, **options):
        user_id = options.get("user_id")

        if not user_id:
            self.stdout.write(self.style.ERROR("--user-id is required"))
            return

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"User with ID {user_id} not found")
            )
            return

        # Ensure balance record exists
        user_balance, _ = UserBalance.objects.update_or_create(
            user=user,
            company_id=user.company_id,
            defaults={"exchangeable_coin": 2000},
        )

        now = timezone.now()
        start_date = (now - timedelta(days=60)).date()
        end_date = now.date()

        with transaction.atomic():
            cur = start_date
            while cur <= end_date:
                # Simulate login bonus ~90% of days
                if random.random() < 0.9:
                    user.received_pearl(
                        PEARL_LOGIN_BONUS, TransactionTypes.LOGIN_BONUS.value
                    )

                # Task completions: 1-4 per day
                for _ in range(random.randint(1, 4)):
                    user.received_pearl(
                        PEARL_TASK_COMPLETE,
                        TransactionTypes.TASK_COMPLETE.value,
                    )

                # Work time coin usage: 1-5 occurrences
                for _ in range(random.randint(1, 5)):
                    user.received_coin(
                        COIN_WORK_TIME, TransactionTypes.WORK_TIME.value
                    )

                # Thanks message coin usage: ~60% chance
                if random.random() < 0.6:
                    user.received_coin(
                        COIN_THANKS_MSG, TransactionTypes.THANKS_MSG.value
                    )

                # MVP vote coin usage: ~30% chance
                if random.random() < 0.3:
                    user.received_coin(
                        COIN_VOTE_MVP, TransactionTypes.VOTE_MVP.value
                    )

                # Skill up purchases more often
                if random.random() < 0.3:
                    step_amount = random.choice(
                        [
                            COIN_SKILL_UP_STEP1,
                            COIN_SKILL_UP_STEP2,
                            COIN_SKILL_UP_STEP3,
                        ]
                    )
                    user.received_coin(
                        step_amount, TransactionTypes.SKILL_UP.value
                    )

                # Allow multiple exchanges over the period after day 10
                if (cur - start_date).days > 10 and random.random() < 0.2:
                    amount = random.choice([300, 400, 500])
                    if user.coin > amount:
                        user.use_coin(amount, TransactionTypes.EXCHANGE.value)

                cur += timedelta(days=1)

            user_balance.exchangeable_coin = 2000
            user_balance.save()

        self.stdout.write(
            self.style.SUCCESS("Successfully created fake point data!")
        )
