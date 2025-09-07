from django.db.models import Sum, Count, Max
from django.utils.timezone import now

from thanks_messages.models import ThanksMessage
from users.models import LoginBonus, TaskRewardLog
from users.constants import COIN_THANKS_MSG, TransactionTypes


class TransactionService:
    def reward_thanks_message(self, user, close_date, close_date_prev):
        """
        Reward coins for received ThanksMessage.
        """
        thanks_count = ThanksMessage.objects.filter(
            recipient=user,
            created_at__gt=close_date_prev,
            created_at__lte=close_date,
        ).count()

        if thanks_count > 0:
            user.received_coin(
                amount=thanks_count * COIN_THANKS_MSG,
                transaction_type=TransactionTypes.THANKS_MSG.value,
            )

    def reward_login_bonus(self, user, close_date, close_date_prev):
        """
        Reward pearls for daily login bonus.
        """
        login_bonus_point = (
            LoginBonus.objects.filter(
                user=user,
                created_at__gt=close_date_prev,
                created_at__lte=close_date,
            )
            .aggregate(total=Sum("bonus_points"))
            .get("total")
            or 0
        )

        if login_bonus_point > 0:
            user.received_pearl(
                amount=login_bonus_point,
                transaction_type=TransactionTypes.LOGIN_BONUS.value,
            )

    def reward_task_complete(self, user, close_date, close_date_prev):
        """
        Reward pearls for completed tasks.
        """
        task_reward_logs = TaskRewardLog.objects.filter(
            user=user,
            created_at__gt=close_date_prev,
            created_at__lte=close_date,
            rewarded_at__isnull=True,
        )

        pearl_amount = (
            task_reward_logs.aggregate(total=Sum("pearl_amount")).get("total")
            or 0
        )

        if pearl_amount > 0:
            task_reward_logs.update(rewarded_at=now())
            user.received_pearl(
                amount=pearl_amount,
                transaction_type=TransactionTypes.TASK_COMPLETE.value,
            )

    def reward_mvp_vote_winners(self, mvp_vote):
        """
        Distribute coins to users with the most votes in MVP vote.
        If multiple users have the same highest vote count, all get coins.
        """
        # Get all candidates with their vote counts
        candidates_with_votes = mvp_vote.mvp_candidates.annotate(
            vote_count=Count("votes_received")
        ).filter(
            vote_count__gt=0
        )  # Only candidates with votes

        if not candidates_with_votes.exists():
            return  # No votes to distribute coins for

        # Find the maximum vote count
        max_votes = candidates_with_votes.aggregate(
            max_votes=Max("vote_count")
        )["max_votes"]

        # Get all candidates with the maximum vote count
        winners = candidates_with_votes.filter(vote_count=max_votes)

        # Distribute coins to all winners
        for winner in winners:
            winner.user.received_coin(
                amount=mvp_vote.bonus_point,
                transaction_type=TransactionTypes.VOTE_MVP.value,
            )
