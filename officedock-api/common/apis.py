from datetime import timedelta, datetime, time

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, F
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
from calendars.serializers import EventLocationSerializer
from chat.constants import WebSocketEventType
from dashboard.utils import separate_duration_while_keep_running
from mvp_votes.constants import DEFAULT_CONTENT_TWEET_END_VOTE
from mvp_votes.models import MVPVoteManagement
from skills.models import StatisticCategory, Skill, SkillMapSkillLevel
from organizations.serializers import (
    BaseStatisticCategorySerializer,
    OrganizationDetailSerializer,
)
from skills.serializers import SkillSerializer
from stat_data.constants import ALL_TEAM
from surveys.constants import DEFAULT_CONTENT_TWEET_END_SURVEY
from surveys.models import Survey
from tags.serializers import BaseTagSerializer

from tweets.models import Tweet
from users.serializers import RoleSerializer
from users.models import Role, RoleDetail, User
from tasks.models import TaskStatus, Task, TaskDuration
from tasks.constants import (
    TaskTypes,
    TaskCategoryTypes,
)
from organizations.models import Organization
from roles.constants import Actions, Screens, SelectionResultOptions
from chat.models import ChatRoom
from thanks_messages.models import ThanksMessage
from .serializers import (
    CreationDataOrganizationSerializer,
    CreationDataTaskListSerializer,
    CreationDataUserSerializer,
    CreationDataTagSerializer,
    CreationDataTaskSerializer,
    CreationDataTaskStatusSerializer,
    CreationDataUserWithOrganizationSerializer,
    OrganizationWithUserNotHaveSkillMapSerializer,
    CreationDataOrganizationWithTagSerializer,
    CreationDataOrganizationWithStructCategorySerializer,
    CreationDataOrganizationWithUserSerializer,
)
from .utils import (
    check_task_overtime,
    get_organizations_of_user_by_screen_role,
    send_web_socket_event,
    to_snake_case,
    transform_statistic_categories,
    validate_company_organization,
)


@extend_schema(tags=["System > Creation Data"])
class SystemCreationDataViewSet(BaseAPIViewSet):
    """
    API endpoint for CreationData.
    """

    permission_classes = [IsAuthenticated]

    @action(
        methods=["GET"],
        detail=False,
        url_path="role",
        serializer_class=RoleSerializer,
    )
    def role(self, request):
        """
        Get creation data for Role
        """

        roles = (
            Role.objects.filter(
                Q(system_role=True) | Q(company_id=request.user.company_id)
            )
            .order_by("id")
            .all()
        )
        return self.response_ok(self.get_serializer(roles, many=True).data)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "current_screen",
                type=str,
                enum=[
                    Screens.CATEGORY_HIERARCHY.value,
                    Screens.MY_TASK_SKILL_MAP.value,
                    Screens.TEAM_DOCK_SKILL_MAP.value,
                    Screens.SKILL_MAP_MANAGEMENT.value,
                    Screens.USER.value,
                    Screens.TEAMDOCK.value,
                ],
            ),
            OpenApiParameter("is_with_staff", type=bool),
            OpenApiParameter("is_hierarchy", type=bool),
            OpenApiParameter("user_id", type=str, required=False),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="organization",
        serializer_class=CreationDataOrganizationSerializer,
    )
    def organization(self, request):
        """
        Get creation data for Organization
        """
        is_with_staff = request.query_params.get("is_with_staff")
        is_hierarchy = request.query_params.get("is_hierarchy")
        screen = request.query_params.get("current_screen")
        user_id = request.query_params.get("user_id")
        organizations = request.user.company.organizations.order_by(
            "-created_at"
        )

        # Filter organizations by role permissions
        if screen:
            screen = to_snake_case(screen)
            if screen == Screens.TEAMDOCK.value:
                user = (
                    get_object_or_404(User, id=user_id)
                    if user_id
                    else request.user
                )
                organizations = Organization.all_objects.filter(
                    users=user
                ).all()
                data = {
                    "organizations": CreationDataOrganizationWithStructCategorySerializer(
                        organizations, many=True, context={"user": user}
                    ).data,
                }
                return self.response_ok(data)
            action = Actions.ADD.value
            permission_name = f"{screen}_{action}"

            # Retrieve the role permission
            role_permissions = RoleDetail.objects.filter(
                role__users=request.user, permission__name=permission_name
            ).all()
            if role_permissions:
                selection_results = [
                    item.selection_result for item in role_permissions
                ]
                if SelectionResultOptions.ALLOWED.value in selection_results:
                    organizations = organizations
                elif (
                    SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
                    in selection_results
                ):
                    org_ids = list(
                        request.user.organizations.values_list("id", flat=True)
                    )
                    # Handle get hierarchy
                    def _get_children(instance):
                        children = instance.organizations.all()
                        for child in children:
                            org_ids.append(child.id)
                            _get_children(child)

                    _get_children(request.user)
                    org_ids = set(org_ids)
                    organizations = organizations.filter(id__in=org_ids)

        if is_with_staff:  # Get organization have staff not create skill map
            organizations = (
                organizations.annotate(
                    total_users=Count(
                        "users", distinct=True
                    ),  # Total number of Users in each Organization
                    users_with_skill_maps=Count(
                        "users",
                        filter=Q(users__skill_maps__organization=F("id")),
                        # Count Users with SkillMap linked to the current Organization
                        distinct=True,
                    ),
                )
                .filter(
                    total_users__gt=0
                )  # Exclude Organizations with no Users
                .filter(users_with_skill_maps__lt=F("total_users"))
                # Only select Organizations where not all Users have a SkillMap linked to that Organization
            )
            return self.response_ok(
                OrganizationWithUserNotHaveSkillMapSerializer(
                    organizations, many=True
                ).data
            )

        if is_hierarchy:
            organizations = (
                organizations.filter(
                    organizations_statistic_categories__isnull=True
                )
                .distinct()
                .all()
            )
        else:
            organizations = organizations.all()

        return self.response_ok(
            self.get_serializer(organizations, many=True).data
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=str, required=False),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="task",
        serializer_class=CreationDataTaskSerializer,
    )
    def task(self, request):
        """
        Get creation data for Tag
        """
        user = request.user
        company = user.company
        organization_id = request.query_params.get("organization_id")
        validate_company_organization(company, organization_id)
        status = TaskStatus.objects.order_by("created_at").all()
        organizations = Organization.objects.filter(
            Q(users=user) | Q(id=organization_id)
        ).order_by("-created_at")
        list_cats = []
        for organization in organizations:
            organization_categories = OrganizationDetailSerializer(
                organization
            ).data["statistic_categories"]
            categories = transform_statistic_categories(organization_categories)
            list_cats.append(
                {
                    "organization": CreationDataOrganizationSerializer(
                        organization
                    ).data,
                    "categories": [
                        cat[TaskCategoryTypes.LARGE.value]
                        for cat in categories
                        if cat.get(TaskCategoryTypes.LARGE.value) is not None
                    ],
                }
            )
        tags = (
            company.tags.filter(
                is_hidden=False,
                organizations__id__in=[organization_id]
                if organization_id
                else organizations,
            )
            .order_by("created_at")
            .distinct()
        )

        data = {
            "tags": CreationDataTagSerializer(
                tags, many=True, context={"user": user}
            ).data,
            "status": CreationDataTaskStatusSerializer(status, many=True).data,
            "types": [item.value for item in TaskTypes],
            "organizations": CreationDataOrganizationWithTagSerializer(
                organizations, many=True
            ).data,
            "organization_categories": list_cats,
        }

        return self.response_ok(data)

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

    @action(methods=["GET"], detail=False, url_path="schedule")
    def schedule(self, request):
        """
        Get creation data for Schedule
        """
        company = request.user.company
        users = company.users.order_by("created_at").all()
        calendar_org = company.get_calendar_organization()
        event_locations = company.event_locations.order_by("created_at").all()
        tags = (
            company.tags.filter(
                is_hidden=False,
                organizations=calendar_org,
            )
            .order_by("created_at")
            .all()
            .distinct()
        )

        organization_categories = OrganizationDetailSerializer(
            calendar_org
        ).data["statistic_categories"]
        categories = transform_statistic_categories(organization_categories)

        data = {
            "members": CreationDataUserWithOrganizationSerializer(
                users, many=True
            ).data,
            "tags": BaseTagSerializer(tags, many=True).data,
            "types": [item.value for item in ScheduleTypes],
            "event_locations": EventLocationSerializer(
                event_locations, many=True
            ).data,
            "categories": categories,
            "organization": CreationDataOrganizationSerializer(
                calendar_org
            ).data,
        }

        return self.response_ok(data)

    @action(
        methods=["GET"],
        detail=False,
        url_path="statistic-categories",
        serializer_class=BaseStatisticCategorySerializer,
    )
    def statistic_categories(self, request):
        """
        Get all statistic categories
        """
        objs = StatisticCategory.objects.filter(
            company_id=request.user.company_id
        ).order_by("created_at")

        return self.response_ok(self.get_serializer(objs, many=True).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int, required=False),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="organization-skills",
        serializer_class=SkillSerializer,
    )
    def organization_skills(self, request):
        """
        Get all organization skills
        """
        organization_id = request.query_params.get("organization_id", None)
        company_id = request.user.company_id
        orgs = Organization.objects.filter(company_id=company_id)

        if organization_id:
            orgs = orgs.filter(id=organization_id)
        results = []
        for org in orgs:
            skills = Skill.objects.filter(
                company_id=company_id, organization_id=org.id
            ).order_by("id")

            results.append(
                {
                    "organization": {
                        "id": org.id,
                        "name": org.name,
                    },
                    "skills": [
                        {"id": skill.id, "name": skill.name} for skill in skills
                    ],
                }
            )

        return self.response_ok(results)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int, required=False),
        ],
    )
    @action(methods=["GET"], detail=False, url_path="tags")
    def tags(self, request):
        """
        Get tags by company
        """

        tags = request.user.company.tags.order_by("created_at").all()

        return self.response_ok(BaseTagSerializer(tags, many=True).data)

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=int, required=False),
            OpenApiParameter("is_statistic", type=bool, required=False),
            OpenApiParameter("is_calendar_page", type=bool, required=False),
            OpenApiParameter("is_chat_page", type=bool, required=False),
        ],
    )
    @action(methods=["GET"], detail=False, url_path="statistics")
    def statistics(self, request):
        """
        Returns organization creation data and necessary metadata for initializing Task, Calendar, Statistics, and Chat modules
        """
        organization_id = request.query_params.get("organization_id")
        is_statistic = request.query_params.get("is_statistic")
        is_calendar_page = request.query_params.get("is_calendar_page")
        is_chat_page = request.query_params.get("is_chat_page")
        user = request.user
        company = user.company
        organizations = []
        if not organization_id:
            organizations = user.organizations.all()
        else:
            organization = validate_company_organization(
                company, organization_id
            )
            organizations = [organization]
        data = {}
        calendar_org = company.get_calendar_organization()

        def _get_tags_by_organizations(input_organizations):
            return (
                company.tags.filter(
                    is_hidden=False,
                    organizations__in=input_organizations,
                )
                .order_by("created_at")
                .all()
                .distinct()
            )

        def _handle_get_data_organization_of_task(data):
            data[
                "organizations"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                organizations, many=True, context={"user": user}
            ).data
            data["members"] = CreationDataUserSerializer(
                organizations[0].users.order_by("created_at"), many=True
            ).data
            tags = _get_tags_by_organizations(organizations)
            data["tags"] = BaseTagSerializer(tags, many=True).data
            return data

        def _handle_get_data_organization_of_team_statistic(data):
            # Return data for team dock statistic (response data of current organization and with calendar organization)
            data[
                "organizations"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                [organization, calendar_org], many=True, context={"user": user}
            ).data
            members = {
                organization.id: CreationDataUserSerializer(
                    organization.users.order_by("created_at"), many=True
                ).data,
            }

            for org in data["organizations"]:
                org["members"] = members[organization.id]
            organizations_by_role = get_organizations_of_user_by_screen_role(
                user, Screens.TEAMDOCK.value, Actions.VIEW.value
            )
            # Insert option all team to pulldown choose organization for statistic to start of a list
            tags = _get_tags_by_organizations(organizations_by_role)
            data["organizations"].insert(
                0,
                {
                    "id": ALL_TEAM,
                    "name": ALL_TEAM,
                    "statistic_categories": [],
                    "tags": CreationDataTagSerializer(
                        tags, many=True, context={"user": user}
                    ).data,
                    "members": members[
                        organization.id
                    ],  # Get list user of current organization for all team
                },
            )
            return data

        def _handle_get_data_organization_my_statistic(data):
            data[
                "organizations"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                organizations, many=True, context={"user": user}
            ).data
            # Add calendar organization
            data["organizations"].append(
                CreationDataOrganizationWithStructCategorySerializer(
                    calendar_org, context={"user": user}
                ).data
            )
            tags = (
                company.tags.filter(
                    is_hidden=False, organizations__in=organizations
                )
                .all()
                .distinct()
            )
            # Insert option all team to pulldown choose organization for statistic to start of a list
            data["organizations"].insert(
                0,
                {
                    "id": ALL_TEAM,
                    "name": ALL_TEAM,
                    "statistic_categories": [],
                    "tags": CreationDataTagSerializer(
                        tags, many=True, context={"user": user}
                    ).data,
                },
            )

            return data

        if not is_calendar_page:
            # Return organization data for creation task
            if organization_id and not is_statistic:
                data = _handle_get_data_organization_of_task(data)
                return self.response_ok(data)
            # Return organization data for statistic pulldown
            if is_statistic:
                if organization_id:
                    data = _handle_get_data_organization_of_team_statistic(data)
                    return self.response_ok(data)
                else:
                    data = _handle_get_data_organization_my_statistic(data)
                    return self.response_ok(data)

        if (is_calendar_page or is_chat_page) and not organization_id:
            list_org = []
            for organization in organizations:
                list_org.append(
                    CreationDataOrganizationWithUserSerializer(
                        organization
                    ).data
                )
            data["organizations"] = list_org
            if is_calendar_page:
                data[
                    "calendar_organization"
                ] = CreationDataOrganizationWithStructCategorySerializer(
                    calendar_org, context={"user": user}
                ).data
                data["locations"] = EventLocationSerializer(
                    company.event_locations.all(), many=True
                ).data
        return self.response_ok(data)


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
            end_date__lt=now(), is_start=True
        ).all()
        if mvp_votes:
            for mvp_vote in mvp_votes:
                mvp_vote.is_start = False
                mvp_vote.save()
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
