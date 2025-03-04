from datetime import timedelta, datetime, time

from django.db import transaction
from django.db.models import Count, Q, F
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from base.apis import BaseAPIViewSet
from base.permissions import IsCronJob
from calendars.constants import (
    ScheduleTypes,
    SCHEDULE_CATEGORIES,
    CalendarTypes,
)
from calendars.models import Schedule
from chat.constants import WebSocketEventType
from skills.models import StatisticCategory
from organizations.serializers import (
    StatisticCategorySerializer,
    OrganizationDetailSerializer,
)
from tags.serializers import BaseTagSerializer

from users.serializers import RoleSerializer
from users.models import Role, RoleDetail, User
from tasks.models import TaskStatus, Task, TaskDuration
from tasks.constants import (
    TASK_WORK_TYPES,
    TaskPriorities,
    TaskTypes,
    TaskCategoryTypes,
)
from skills.serializers import SkillSerializer
from organizations.models import OrganizationsSkills
from roles.constants import Actions, Screens, SelectionResultOptions
from organizations.models import Organization
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
)
from .utils import send_web_socket_event, transform_statistic_categories, check_task_overtime


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
                    Screens.ORGANIZATION_SKILL.value,
                    Screens.USER.value,
                ],
            ),
            OpenApiParameter("is_with_staff", type=bool),
            OpenApiParameter("is_hierarchy", type=bool),
            OpenApiParameter("is_with_skill", type=bool),
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
        is_with_skill = request.query_params.get("is_with_skill")
        screen = request.query_params.get("current_screen")
        organizations = request.user.company.organizations.order_by(
            "created_at"
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
                    organizations = organizations
                elif (
                    SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
                    in selection_results
                ):
                    org_ids = request.user.organizations.values_list(
                        "id", flat=True
                    )
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

        if is_with_skill:
            organizations = (
                organizations.filter(organizations_skills__isnull=True)
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
        url_path="people-in-charge",
        serializer_class=CreationDataUserSerializer,
    )
    def people_in_charge(self, request):
        """
        Get creation data for people in charge
        """

        if organization_id := request.query_params.get("organization_id"):
            users = (
                User.objects.filter(organizations__id=organization_id)
                .order_by("created_at")
                .all()
            )
        else:
            users = (
                User.objects.filter(company=request.user.company)
                .order_by("created_at")
                .all()
            )

        return self.response_ok(self.get_serializer(users, many=True).data)

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

        tags = request.user.company.tags.order_by("created_at").all()
        status = TaskStatus.objects.order_by("created_at").all()
        organizations = request.user.organizations.order_by("created_at")
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

        data = {
            "tags": CreationDataTagSerializer(
                tags, many=True, context={"user": self.request.user}
            ).data,
            "status": CreationDataTaskStatusSerializer(status, many=True).data,
            "types": [item.value for item in TaskTypes],
            "priorities": [item.value for item in TaskPriorities],
            "organizations": CreationDataOrganizationSerializer(
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
                org_ids = Organization.objects.filter(
                    users__id__in=ids
                ).values_list("id", flat=True)
                tasks = tasks.filter(
                    Q(organization_id__in=org_ids) | Q(created_by_id__in=ids)
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
                org_ids = Organization.objects.filter(
                    users__id__in=ids
                ).values_list("id", flat=True)
                tasks = tasks.filter(
                    Q(organization_id__in=org_ids) | Q(created_by_id__in=ids)
                )

        # Get list of tasks by user logged in
        else:
            organizations = request.user.organizations.order_by("created_at")
            tasks = tasks.filter(
                Q(organization__in=organizations) | Q(created_by=request.user)
            )

        # Filter input keyword
        if search_query := request.query_params.get("search"):
            tasks = tasks.filter(title__icontains=search_query)

        return self.response_pagination(
            request, tasks, CreationDataTaskListSerializer
        )

    @action(methods=["GET"], detail=False, url_path="schedule")
    def schedule(self, request):
        """
        Get creation data for Schedule
        """

        tags = request.user.company.tags.order_by("created_at").all()
        users = request.user.company.users.order_by("created_at").all()
        organizations = request.user.company.organizations.order_by(
            "created_at"
        )
        data = {
            "members": CreationDataUserWithOrganizationSerializer(
                users, many=True
            ).data,
            "tags": BaseTagSerializer(tags, many=True).data,
            "types": [item.value for item in ScheduleTypes],
            "organizations": CreationDataOrganizationSerializer(
                organizations, many=True
            ).data,
        }

        return self.response_ok(data)

    @action(
        methods=["GET"],
        detail=False,
        url_path="statistic-categories",
        serializer_class=StatisticCategorySerializer,
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
            OpenApiParameter("organization_id", type=int, required=True),
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
        organization_id = request.query_params.get("organization_id")

        if not organization_id:
            return self.response_ok([])

        company = request.user.company
        skills = (
            OrganizationsSkills.objects.filter(
                company=company, organization_id=organization_id
            )
            .select_related("skill")
            .order_by("id")
            .distinct()
        )

        return self.response_ok(
            [
                {"id": id, "name": name}
                for id, name in skills.values_list("skill__id", "skill__name")
            ]
        )

    @action(methods=["GET"], detail=False, url_path="tags")
    def tags(self, request):
        """
        Get tags by company
        """

        tags = request.user.company.tags.order_by("created_at").all()

        return self.response_ok(BaseTagSerializer(tags, many=True).data)

    @action(methods=["GET"], detail=False, url_path="category-filters")
    def category_for_filter(self, request):
        """
        Get tags by company
        """
        # TODO: Maybe remove this function if implement category for task or event
        merged_categories = []
        for type, categories in SCHEDULE_CATEGORIES.items():
            for category in categories:
                merged_categories.append({"type": type, "category": category})

        for type, categories in TASK_WORK_TYPES.items():
            for category in categories:
                merged_categories.append({"type": type, "category": category})

        return self.response_ok(merged_categories)


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
            is_over_estimate = False
            is_send_sk = False
            users = []
            related_obj = (
                task_duration.task
                if task_duration.task
                else task_duration.schedule
            )
            if isinstance(related_obj, Task):
                users = related_obj.people_in_charge.all()
                is_send_sk, is_over_estimate = check_task_overtime(
                    related_obj, task_duration, timedelta(minutes=35)
                )
            elif (
                isinstance(related_obj, Schedule)
                and task_duration.is_cancel_alert is False
            ):
                users = related_obj.participants.all()
                diff_time = timezone.now() - related_obj.end_date
                if timedelta(minutes=30) <= diff_time <= timedelta(minutes=35):
                    is_send_sk = True
                    is_over_estimate = True

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
