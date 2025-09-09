from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from base.apis import BaseAPIViewSet
from base.permissions import IsCronJob
from calendars.constants import (
    ScheduleTypes,
    CalendarTypes,
)
from calendars.models import Schedule
from chat.constants import WebSocketEventType
from common.helpers import (
    get_all_organizations,
    get_balances_of_user,
    get_data_organization_my_statistic,
    get_data_organization_team_statistic,
    get_event_locations,
    get_filter_organization_categories,
    get_items_of_user,
    get_members,
    get_organization_skills,
    get_organization_with_categories,
    get_organization_with_users,
    get_organizations_of_user_by_screen_role,
    get_roles,
    get_statistic_categories,
    get_tags,
    get_task_status,
    get_user_setting,
)
from companies.serializers import CompanySerializer
from dashboard.utils import separate_duration_while_keep_running
from mvp_votes.constants import DEFAULT_CONTENT_TWEET_END_VOTE, MVPVoteTypes
from mvp_votes.models import MVPVoteManagement
from skills.models import SkillMapSkillLevel
from surveys.constants import DEFAULT_CONTENT_TWEET_END_SURVEY
from surveys.models import Survey

from tweets.models import Tweet
from users.models import User, UserBalance
from tasks.models import Task, TaskDuration
from tasks.constants import (
    TaskTypes,
)
from roles.constants import Actions, Screens
from chat.models import ChatRoom
from thanks_messages.models import ThanksMessage
from companies.models import Company
from thanks_messages.models import ThanksMessage
from common.services import TransactionService
from .serializers import (
    CreationDataOrganizationSerializer,
    CreationDataTaskListSerializer,
)
from .utils import (
    calculate_company_dates,
    check_task_overtime,
    send_web_socket_event,
    to_snake_case,
    validate_company_organization,
)


@extend_schema(tags=["System > Creation Data"])
class SystemCreationDataViewSet(BaseAPIViewSet):
    """
    API endpoint for CreationData.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("user_id", type=int),
            OpenApiParameter("get_roles", type=bool),
            OpenApiParameter("get_all_members", type=bool),
            OpenApiParameter("get_all_organizations", type=bool),
            OpenApiParameter("get_organization_members", type=bool),
            OpenApiParameter("get_tags", type=bool),
            OpenApiParameter("get_tags_of_organization", type=bool),
            OpenApiParameter("get_task_status", type=bool),
            OpenApiParameter("get_event_types", type=bool),
            OpenApiParameter("get_event_locations", type=bool),
            OpenApiParameter("get_organization_skills", type=bool),
            OpenApiParameter("get_statistic_categories", type=bool),
            OpenApiParameter("is_organization_calendar", type=bool),
            OpenApiParameter("get_organizations_of_user_by_screen", type=str),
            OpenApiParameter("get_organization_with_categories", type=bool),
            OpenApiParameter("get_organization_for_team_statistic", type=bool),
            OpenApiParameter("get_user_setting", type=bool),
            OpenApiParameter("get_filter_organization_categories", type=bool),
            OpenApiParameter("get_organization_with_users", type=bool),
            OpenApiParameter("get_organization_for_my_statistic", type=bool),
            OpenApiParameter("get_company", type=bool),
            OpenApiParameter("get_items_of_user", type=bool),
            OpenApiParameter("get_balances_of_user", type=bool),
        ]
    )
    @action(methods=["GET"], detail=False, url_path="common")
    def common_data(self, request):
        """
        Handle and response data base on query params
        """
        user = request.user
        company = user.company
        organization_id = request.query_params.get("organization_id")
        organization = None
        if organization_id:
            organization = validate_company_organization(
                company, organization_id
            )

        if "is_organization_calendar" in request.query_params:
            organization = company.get_calendar_organization()
        user_id = request.query_params.get("user_id")
        if user_id:
            user = get_object_or_404(User, id=user_id)
        response_data = {}
        organizations = None
        if "get_company" in request.query_params:
            response_data["company"] = CompanySerializer(company).data
        if "get_all_organizations" in request.query_params:
            organizations = get_all_organizations(company, organizations)
            response_data[
                "all_organizations"
            ] = CreationDataOrganizationSerializer(
                organizations, many=True
            ).data
        if "get_roles" in request.query_params:
            response_data["roles"] = get_roles(company)
        if "get_all_members" in request.query_params:
            response_data["all_members"] = get_members(company)
        if "get_organization_members" in request.query_params:
            response_data["organization_members"] = get_members(
                company, organization
            )
        if "get_tags" in request.query_params:
            response_data["tags"] = get_tags(company, organization)
        if "get_task_status" in request.query_params:
            response_data["task_status"] = get_task_status()
        if "get_event_types" in request.query_params:
            response_data["event_types"] = [
                item.value for item in ScheduleTypes
            ]
        if "get_event_locations" in request.query_params:
            response_data["event_locations"] = get_event_locations(company)
        if "get_organization_skills" in request.query_params:
            organizations = get_all_organizations(company, organizations)
            response_data["organization_skills"] = get_organization_skills(
                organizations, organization
            )
        if "get_statistic_categories" in request.query_params:
            response_data["statistic_categories"] = get_statistic_categories(
                company
            )
        if (
            "get_organizations_of_user_by_screen" in request.query_params
            and to_snake_case(
                request.query_params.get("get_organizations_of_user_by_screen")
            )
            in Screens.values()
        ):
            screen_name = to_snake_case(
                request.query_params.get("get_organizations_of_user_by_screen")
            )
            action = Actions.ADD.value
            response_data[
                "organizations"
            ] = get_organizations_of_user_by_screen_role(
                user, screen_name, action
            )
        if "get_organization_with_categories" in request.query_params:
            organizations = get_all_organizations(
                company, organizations
            ).filter(users=user)
            response_data[
                "organization_categories"
            ] = get_organization_with_categories(
                organizations, organization, user
            )
        if "get_organization_for_team_statistic" in request.query_params:
            response_data[
                "organization_statistics"
            ] = get_data_organization_team_statistic(
                user, company, organization
            )
        if "get_organization_for_my_statistic" in request.query_params:
            organizations = get_all_organizations(company, organizations)
            response_data["my_statistics"] = get_data_organization_my_statistic(
                user, organizations, company
            )
        if "get_user_setting" in request.query_params:
            response_data["user_setting"] = get_user_setting(user)
        if "get_filter_organization_categories" in request.query_params:
            organizations = (
                get_all_organizations(company, organizations)
                .filter(Q(users=user) | Q(id=organization))
                .order_by("-created_at")
                .all()
            )
            response_data[
                "filter_organizations_categories"
            ] = get_filter_organization_categories(organizations)
            response_data["user_setting"] = get_user_setting(user)
        if "get_organization_with_users" in request.query_params:
            organizations = get_all_organizations(
                company, organizations
            ).filter(users=user)
            response_data["organization_users"] = get_organization_with_users(
                organizations
            )
        if "get_items_of_user" in request.query_params:
            response_data["items_of_user"] = get_items_of_user(user)
        if "get_balances_of_user" in request.query_params:
            response_data["balances_of_user"] = get_balances_of_user(user)

        return self.response_ok(response_data)

    @extend_schema(
        parameters=[
            OpenApiParameter("page_size", type=int, required=False),
            OpenApiParameter("page", type=int, required=False),
            OpenApiParameter("search", type=str, required=False),
            OpenApiParameter("user_ids", type=str, required=False),
            OpenApiParameter("chat_room_code", type=str, required=False),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="tasks",
        serializer_class=CreationDataTaskListSerializer,
    )
    def task_list_options(self, request):
        """
        Get task list of the option
        """

        tasks = (
            Task.objects.filter(deleted_at__isnull=True)
            .exclude(type=TaskTypes.MY_TEMPLATE.value)
            .order_by("-created_at")
        )

        # Get list of tasks by room code
        if chat_room_code := request.query_params.get("chat_room_code"):
            chat_room = ChatRoom.objects.filter(code=chat_room_code).first()
            if chat_room and (
                ids := chat_room.participants.values_list("id", flat=True)
            ):
                tasks = tasks.filter(
                    Q(people_in_charge__id__in=ids) | Q(created_by_id__in=ids)
                )

        # Get list of tasks by user ids
        elif user_ids := request.query_params.get("user_ids"):
            ids = []
            for id in user_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                tasks = tasks.filter(
                    Q(people_in_charge__id__in=ids) | Q(created_by_id__in=ids)
                )

        # Get list of tasks by user logged in
        else:
            user_logged = request.user
            tasks = tasks.filter(
                Q(people_in_charge=user_logged) | Q(created_by=user_logged)
            )

        # Filter input keyword
        if search_query := request.query_params.get("search"):
            tasks = tasks.filter(title__icontains=search_query)

        return self.response_pagination(
            request, tasks.distinct(), CreationDataTaskListSerializer
        )


@extend_schema(tags=["System > Cron Job"])
class CronJobViewSet(BaseAPIViewSet):
    """API endpoint of Cron job viewset"""

    permission_classes = [AllowAny, IsCronJob]

    @extend_schema(
        parameters=[OpenApiParameter("cronjob_key", type=str, required=True)]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="remind",
    )
    @transaction.atomic()
    def remind(self, request):
        """
        Get remind notify of task
        """
        # Check end date of MVP vote and create tweet if have MVP vote finish.
        mvp_votes = MVPVoteManagement.objects.filter(
            end_date__lt=now(), type=MVPVoteTypes.PRESENT.value
        ).all()
        if mvp_votes:
            for mvp_vote in mvp_votes:
                mvp_vote.type = MVPVoteTypes.PAST.value
                mvp_vote.save()

                # Handle add coin for users with most votes
                transaction_service = TransactionService()
                transaction_service.reward_mvp_vote_winners(mvp_vote)

                Tweet.objects.create(
                    company=mvp_vote.company,
                    is_system=True,
                    content=DEFAULT_CONTENT_TWEET_END_VOTE,
                )

        # Check end date of Survey and create tweet if finish survey
        one_minute_ago = now() - timedelta(minutes=1)
        surveys = Survey.objects.filter(
            end_at__lt=now(), end_at__gte=one_minute_ago
        ).all()
        if surveys:
            for survey in surveys:
                Tweet.objects.create(
                    company=survey.company,
                    is_system=True,
                    content=DEFAULT_CONTENT_TWEET_END_SURVEY,
                )

        # Check time process of skill map
        skill_map_levels = SkillMapSkillLevel.objects.filter(
            skill_map__is_valid=True, popup=True, is_complete=False
        ).all()
        for skill_map_level in skill_map_levels:
            data = self._check_process_skill_map_level(skill_map_level)
            if data:
                send_web_socket_event(
                    data,
                    user=skill_map_level.skill_map.staff,
                )
        # Check and separate duration
        separate_task_duration = TaskDuration.objects.filter(
            Q(paused_at__isnull=True)
            & Q(Q(task__is_start=True) | Q(schedule__is_start=True))
            & Q(started_at__date__lt=now().date())
        )
        if separate_task_duration.exists():
            for duration in separate_task_duration.all():
                separate_duration_while_keep_running(
                    duration, now(), user=duration.user
                )
        # Check and send notify remind of task
        tasks = Task.objects.filter(
            remind_at__lte=timezone.now(), deadline__gt=timezone.now()
        )
        if tasks.exists():
            for task in tasks.all():
                if task.deadline and task.remind_at:
                    reminds = task.reminds
                    users = task.people_in_charge_tasks.all()
                    for user in users:
                        send_web_socket_event(
                            {
                                "id": task.id,
                                "title": task.title,
                                "remind_countdown": reminds["countdown"],
                                "remind_type": reminds["type"],
                                "action": WebSocketEventType.REMIND_TASK.value,
                            },
                            user=user,
                        )

        return self.response_ok()

    @extend_schema(
        parameters=[OpenApiParameter("cronjob_key", type=str, required=True)]
    )
    @action(methods=["POST"], detail=False, url_path="duration-overtime")
    @transaction.atomic()
    def actual_duration_overtime(self, request):
        """Handle check is task running overtime"""
        start_of_today = datetime.combine(timezone.now().date(), time.min)
        task_durations = TaskDuration.objects.filter(
            started_at__gte=start_of_today, paused_at__isnull=True
        ).all()
        for task_duration in task_durations:
            users = []
            related_obj = (
                task_duration.task
                if task_duration.task
                else task_duration.schedule
            )
            if isinstance(related_obj, Task):
                users = related_obj.people_in_charge.all()
            elif (
                isinstance(related_obj, Schedule)
                and task_duration.is_cancel_alert is False
            ):
                users = related_obj.participants.all()

            is_send_sk, is_over_estimate = check_task_overtime(
                related_obj, task_duration, timedelta(minutes=35)
            )

            if is_send_sk:
                for user in users:
                    send_web_socket_event(
                        {
                            "id": task_duration.task.id
                            if isinstance(related_obj, Task)
                            else task_duration.schedule.id,
                            "task_duration_running_uuid": str(
                                task_duration.uuid
                            ),
                            "is_over_estimate": is_over_estimate,
                            "action": WebSocketEventType.DURATION_OVERTIME_WARNING.value,
                            "type": CalendarTypes.TASK.value
                            if isinstance(related_obj, Task)
                            else CalendarTypes.SCHEDULE.value,
                        },
                        user=user,
                    )

        return self.response_ok()

    def _check_process_skill_map_level(self, skill_map_level):
        """
        Handle check skill map level and response data socket
        """
        data = {
            "skill": {
                "id": skill_map_level.skill.id,
                "name": skill_map_level.skill.name,
            },
            "skill_map": skill_map_level.skill_map.id,
            "skill_map_level": skill_map_level.id,
            "measure_count": None,
            "measure_time": None,
            "look_back_interval": None,
            "look_back_type": None,
            "action": WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
        }
        if (
            skill_map_level.next_submit_at
            and skill_map_level.next_submit_at <= now()
        ):
            data["look_back_interval"] = skill_map_level.look_back_interval
            data["look_back_type"] = skill_map_level.look_back_type
            return data
        if skill_map_level.measure_time:
            hours, _, _ = map(
                int, skill_map_level.actual_measure_time.split(":")
            )
            if skill_map_level.measure_time <= hours:
                data["measure_time"] = skill_map_level.measure_time
                return data
        if (
            skill_map_level.measure_count
            and skill_map_level.measure_count
            <= skill_map_level.actual_measure_count
        ):
            data["measure_count"] = skill_map_level.measure_count
            return data

        return False

    @extend_schema(
        parameters=[OpenApiParameter("cronjob_key", type=str, required=True)]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="thanks-messages/remove-soft-deleted",
    )
    @transaction.atomic()
    def delete_thanks_messages(self, request):
        """Handle delete thanks messages if is soft delete after 30 days"""
        threshold_date = now() - timedelta(
            days=settings.THANKS_MESSAGE_SOFT_DELETE_RETENTION_DAYS
        )
        deleted_count, _ = ThanksMessage.objects.filter(
            deleted_at__isnull=False, deleted_at__lte=threshold_date
        ).delete()

        return self.response_ok({"deleted": deleted_count})

    @extend_schema(
        parameters=[
            OpenApiParameter("cronjob_key", type=str, required=True),
        ]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="run-every-day",
    )
    @transaction.atomic
    def cronjob_run_every_day(self, request):
        """
        Daily cronjob endpoint.
        - Clean up soft-deleted thanks messages after retention period
        - Handle company closing and deadline logic
        - Reward users with coins/pearls based on activities
        """
        today = now().date()
        transaction_service = TransactionService()

        # 1. Cleanup soft-deleted thanks messages after retention period
        threshold_date = now() - timedelta(
            days=settings.THANKS_MESSAGE_SOFT_DELETE_RETENTION_DAYS
        )
        deleted_count, _ = ThanksMessage.objects.filter(
            deleted_at__isnull=False, deleted_at__lte=threshold_date
        ).delete()

        # 2. Iterate over all companies to handle closing logic
        for company in Company.objects.all():
            company_dates = calculate_company_dates(company)
            close_date = company_dates["close_date"]
            close_date_prev = company_dates["close_date_prev"]
            deadline_date = company_dates["deadline_date"]

            # --- Case 1: Closing day ---
            if today.day == close_date.day:
                company_users = company.users.all()
                company_users_count = company_users.count()

                user_exchangeable_amount = 0
                if company_users_count > 0:
                    user_exchangeable_amount = (
                        company.exchangeable_amount // company_users_count
                    )
                    if user_exchangeable_amount < company.min_exchange_per_user:
                        user_exchangeable_amount = company.min_exchange_per_user

                for user in company_users:
                    # Reward coins for thanks messages (top voted)
                    transaction_service.reward_thanks_message(
                        user, close_date, close_date_prev
                    )

                    # TODO: Reward coins for skill level up
                    # transaction_service.reward_skill_level_up(user, close_date, close_date_prev)

                    # Reward pearls
                    transaction_service.reward_login_bonus(
                        user, close_date, close_date_prev
                    )
                    transaction_service.reward_task_complete(
                        user, close_date, close_date_prev
                    )

                # Update exchangeable coin for user
                if company_users_count > 0:
                    UserBalance.objects.filter(user__in=company_users).update(
                        exchangeable_coin=user_exchangeable_amount
                    )

            # --- Case 2: Deadline day ---
            elif today.day == deadline_date.day:
                # TODO: implement logic for handling user points after deadline
                # e.g., finalize points, lock editing, issue monthly report, etc.
                pass

        return self.response_ok(
            {
                "today": today.isoformat(),
                "deleted_tks_msg_count": deleted_count,
            }
        )


@extend_schema(tags=["System > DotMoney"])
class DotMoneyViewSet(BaseAPIViewSet):
    """API endpoint of DotMoney"""

    permission_classes = [AllowAny]

    @action(
        methods=["GET"],
        detail=False,
        url_path="exchange",
    )
    @transaction.atomic()
    def exchange(self, request):
        """
        Exchange entrypoint (DotMoney callback)
        """
        # TODO: implement actual exchange request to DotMoney API
        return self.response_ok()
