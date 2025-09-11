from datetime import datetime, time, timedelta
from django.db.models import Q, Sum, Count, Max
from django.utils.timezone import now

from thanks_messages.models import ThanksMessage
from users.models import LoginBonus, TaskRewardLog
from users.constants import COIN_THANKS_MSG, COIN_WORK_TIME, TransactionTypes
from calendars.models import RepeatSchedule
from tasks.models import TaskDuration, TaskSchedule


class TransactionService:
    def reward_thanks_message(
        self, user, date_after_closing, start_date_calculation_deadline
    ):
        """
        Reward coins for received ThanksMessage.
        """
        thanks_count = ThanksMessage.objects.filter(
            recipient=user,
            created_at__gte=start_date_calculation_deadline,
            created_at__lt=date_after_closing,
        ).count()

        if thanks_count > 0:
            user.received_coin(
                amount=thanks_count * COIN_THANKS_MSG,
                transaction_type=TransactionTypes.THANKS_MSG.value,
            )

    def reward_login_bonus(
        self, user, date_after_closing, start_date_calculation_deadline
    ):
        """
        Reward pearls for daily login bonus.
        """
        login_bonus_point = (
            LoginBonus.objects.filter(
                user=user,
                created_at__gte=start_date_calculation_deadline,
                created_at__lt=date_after_closing,
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

    def reward_task_complete(
        self, user, date_after_closing, start_date_calculation_deadline
    ):
        """
        Reward pearls for completed tasks.
        """
        task_reward_logs = TaskRewardLog.objects.filter(
            user=user,
            created_at__gte=start_date_calculation_deadline,
            created_at__lt=date_after_closing,
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

    def _calculate_planned_time_for_date(self, date, user):
        """
        Calculate total planned working time for a user on a specific date.
        Includes both task schedules and calendar schedules.
        """
        total_planned_time = timedelta()

        # Get planned time from task schedules
        task_schedules = TaskSchedule.objects.filter(
            plan_start_date__date=date, task__people_in_charge=user
        )

        for schedule in task_schedules:
            duration = schedule.plan_end_date - schedule.plan_start_date
            total_planned_time += duration

        # Get planned time from calendar schedules (RepeatSchedule)
        repeat_schedules = RepeatSchedule.objects.filter(
            plan_start_date__date=date, schedule__participants=user
        )

        for schedule in repeat_schedules:
            duration = schedule.plan_end_date - schedule.plan_start_date
            total_planned_time += duration

        return total_planned_time

    def _calculate_actual_time_for_date(self, date, user):
        """
        Calculate total actual working time for a user on a specific date.
        Only counts the time worked within that specific date, handling cases where
        work spans across multiple days.
        """
        total_actual_time = timedelta()

        # Get all task durations that overlap with the target date
        # This includes durations that started before but ended on/after the date,
        # or started on/before the date but ended after
        start_of_day = datetime.combine(date, time.min)  # 00:00:00
        end_of_day = datetime.combine(date, time.max)  # 23:59:59

        task_durations = TaskDuration.objects.filter(
            Q(user=user)
            & Q(started_at__lte=end_of_day)
            & Q(  # Started on or before the target date
                Q(paused_at__gte=start_of_day) | Q(paused_at__isnull=True)
            )  # Ended on or after the target date
        )

        for duration in task_durations:
            if duration.started_at and duration.paused_at:
                # Calculate the overlap between the duration and the target date
                effective_start = max(duration.started_at, start_of_day)
                effective_end = min(duration.paused_at, end_of_day)

                # Only add time if there's actual overlap
                if effective_start < effective_end:
                    actual_duration = effective_end - effective_start
                    total_actual_time += actual_duration
            elif duration.started_at and not duration.paused_at:
                # If started but not paused, calculate from max(started_at, start_of_day) to end_of_day
                effective_start = max(duration.started_at, start_of_day)
                if effective_start < end_of_day:
                    actual_duration = end_of_day - effective_start
                    total_actual_time += actual_duration

        return total_actual_time

    def reward_actual_working_time(self, start_date, end_date, user):
        """
        Calculate total number of days that qualify for working time rewards in a month.
        Returns the count of days where actual working time >= 80% of planned working time.
        """
        qualifying_days = 0

        # Process each day from start_date to end_date
        current_date = start_date
        while current_date <= end_date:
            # Calculate planned time for the day
            planned_time = self._calculate_planned_time_for_date(
                current_date, user
            )

            # Calculate actual time for the day
            actual_time = self._calculate_actual_time_for_date(
                current_date, user
            )

            # Check if actual time meets 80% threshold
            if (
                planned_time.total_seconds() > 0
            ):  # Only check if there was planned work
                threshold_time = planned_time * 0.8
                if actual_time >= threshold_time:
                    qualifying_days += 1

            # Move to next day
            current_date += timedelta(days=1)

        if qualifying_days > 0:
            user.received_coin(
                amount=qualifying_days
                * COIN_WORK_TIME,  # 10 coins per qualifying day
                transaction_type=TransactionTypes.WORK_TIME.value,
            )
