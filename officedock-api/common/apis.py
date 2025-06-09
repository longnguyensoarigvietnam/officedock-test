from datetime import timedelta, datetime, time

from django.db import transaction
from django.db.models import Count, Q, F
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
from skills.models import StatisticCategory, Skill, SkillMapSkillLevel
from organizations.serializers import (
    BaseStatisticCategorySerializer,
    OrganizationDetailSerializer,
)
from skills.serializers import SkillSerializer
from tags.serializers import BaseTagSerializer

from users.serializers import RoleSerializer
from users.models import Role, RoleDetail
from tasks.models import TaskStatus, Task, TaskDuration
from tasks.constants import (
    TaskTypes,
    TaskCategoryTypes,
)
from organizations.models import Organization
from roles.constants import Actions, Screens, SelectionResultOptions
from chat.models import ChatRoom
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
    send_web_socket_event,
    transform_statistic_categories,
    check_task_overtime,
    add_default_entries_to_categories,
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
                Q(system_role=True) | Q(company=request.user.company)
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
                    Screens.SKILL_MAP.value,
                    Screens.USER.value,
                ],
            ),
            OpenApiParameter("is_with_staff", type=bool),
            OpenApiParameter("is_hierarchy", type=bool),
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
        organizations = request.user.company.organizations.order_by(
            "-created_at"
        )

        # Filter organizations by role permissions
        if screen:
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
                    # FIXME: Rollback code when implement skill map permission
                    # organizations = organizations -> OLD CODE
                    organizations = (
                        request.user.organizations.all()
                        if screen == "skill_map"
                        else organizations
                    )
                elif (
                    SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
                    in selection_results
                ):
                    org_ids = request.user.organizations.values_list(
                        "id", flat=True
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
        organization_id = request.query_params.get("organization_id")
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
            user.company.tags.filter(
                is_hidden=False,
                organizations__id__in=[organization_id]
                if organization_id
                else organizations,
            )
            .order_by("created_at")
            .all()
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

        tasks = Task.objects.exclude(type=TaskTypes.MY_TEMPLATE.value).order_by(
            "-created_at"
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
        users = request.user.company.users.order_by("created_at").all()
        calendar_org = request.user.company.get_calendar_organization()
        event_locations = request.user.company.event_locations.order_by(
            "created_at"
        ).all()
        tags = (
            request.user.company.tags.filter(
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
            company=request.user.company
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
        company = request.user.company
        orgs = Organization.objects.filter(company=company)

        if organization_id:
            orgs = orgs.filter(id=organization_id)
        results = []
        for org in orgs:
            skills = Skill.objects.filter(
                company=company, organization_id=org.id
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
        ],
    )
    @action(methods=["GET"], detail=False, url_path="statistics")
    def statistics(self, request):
        """
        Return creation data for statistics
        """
        organization_id = request.query_params.get("organization_id")
        is_statistic = request.query_params.get("is_statistic")
        is_calendar_page = request.query_params.get("is_calendar_page")
        user = request.user
        organizations = []
        if not organization_id:
            organizations = user.organizations.all()
        elif organization := Organization.all_objects.filter(
            id=organization_id
        ).first():
            organizations = [organization]
        data = {}
        tags = (
            request.user.company.tags.filter(
                is_hidden=False,
                organizations__in=organizations,
            )
            .order_by("created_at")
            .all()
            .distinct()
        )
        calendar_org = user.company.get_calendar_organization()

        def _handle_get_data_organization_of_task(data):
            data[
                "organization"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                organizations[0], context={"user": user}
            ).data
            data["members"] = CreationDataUserSerializer(
                organizations[0].users.order_by("created_at"), many=True
            ).data
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
                calendar_org.id: CreationDataUserSerializer(
                    calendar_org.users.order_by("created_at"), many=True
                ).data,
            }

            for org in data["organizations"]:
                org["statistic_categories"] = add_default_entries_to_categories(
                    org["statistic_categories"]
                )
                org["members"] = members[org["id"]]
            return data

        def _handle_get_data_organization_my_statistic(data):
            data[
                "organizations"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                organizations, many=True, context={"user": user}
            ).data
            for org in data["organizations"]:
                org["statistic_categories"] = add_default_entries_to_categories(
                    org["statistic_categories"]
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

        if is_calendar_page and not organization_id:
            list_org = []
            for organization in organizations:
                list_org.append(
                    CreationDataOrganizationWithUserSerializer(
                        organization
                    ).data
                )
            data["organizations"] = list_org
            data[
                "calendar_organization"
            ] = CreationDataOrganizationWithStructCategorySerializer(
                calendar_org, context={"user": user}
            ).data
            data["locations"] = EventLocationSerializer(
                user.company.event_locations.all(), many=True
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
        tasks = Task.objects.filter(
            remind_at__lte=timezone.now(), deadline__gt=timezone.now()
        ).all()
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

        for task in tasks:
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
