from datetime import datetime, time, timedelta
from time import timezone

from dateutil import rrule
from django.db import transaction
from django.db.models import (
    Case,
    When,
    OuterRef,
    Subquery,
    Q,
    Value,
    DateTimeField,
    IntegerField,
    Max,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.timezone import make_aware, now
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework import filters, mixins, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from base.apis import BaseAPIViewSet
from base.constants import REPLACE_NULL_DATE, REPLACE_NULL_DATE_WITH_FUTURE
from base.messages import ERROR_MESSAGES
from base.permissions import ActionPermission
from calendars.constants import CalendarTypes
from chat.constants import (
    WebSocketEventType,
    ChatMessageTypes,
    ChatRoomTypes,
)
from chat.serializers import (
    ChatMessageSerializer,
    ChatRoomsParticipantsWebSocketSerializer,
)
from common.constants import BASE_DATETIME_FORMAT
from common.filters import CustomOrderFilter
from common.serializers import CreationDataUserSerializer
from common.utils import (
    filter_task_index_team,
    parse_search_date,
    send_web_socket_event,
    create_categories_by_model,
    check_task_overtime,
    split_id_from_string,
    get_common_categories,
    compare_list_categories,
    validate_company_organization,
)
from stat_data.utils import validate_date_by_regex_and_reformat
from tasks.constants import (
    DEFAULT_PAGE_SIZE,
    INITIAL_INDEX_VALUE,
    TaskTypes,
    TaskStatus,
    FrequencyMap,
    LIMIT_DAY,
    CalculateSkillMapProcessCases,
)
from tasks.utils import (
    create_task_schedule,
    create_todo_list_for_task,
    delete_task_schedules,
    delete_todo_list_for_task,
    update_task_schedule,
    update_todo_list_for_task,
    calculate_new_time,
    calculate_progress_skill_map,
)
from roles.constants import Screens
from users.utils import reset_sort_task
from users.models import Setting
from users.models import User
from .models import (
    PeopleInChargeTasks,
    Task,
    TaskDuration,
    TaskFrequent,
    TaskIndex,
    TaskSchedule,
    TeamTaskIndex,
    TodoList,
    TaskStatus as TaskStatusModel,
)
from .serializers import (
    TaskBoardSerializer,
    TaskCalendarSerializer,
    TaskCommonSerializer,
    TaskIndexForCreationSerializer,
    TaskIndexPinAtSerializer,
    TaskIndexSerializer,
    TaskScheduleForCreationSerializer,
    TaskScheduleSerializer,
    TaskSerializer,
    TaskTeamdockSerializer,
    TaskTemplateSerializer,
    TeamTaskIndexSerializer,
    TodoListSerializer,
    TaskScheduleForCreationMultipleSerializer,
)
from .filters import TaskBoardFilter, TaskCalendarFilter, TaskScheduleFilter


@extend_schema(tags=["System > Task"])
class TaskViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint that allows tasks to be viewed or edited.
    """

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [ActionPermission]
    screen_name = Screens.MY_TASK.value

    def get_queryset(self):
        """
        Allow the task in the logged in user's company
        """
        if self.action in ["retrieve"]:
            return (
                super()
                .get_queryset()
                .filter(
                    company_id=self.request.user.company_id,
                    deleted_at__isnull=True,
                )
            )

        return (
            super()
            .get_queryset()
            .filter(company_id=self.request.user.company_id)
        )

    @transaction.atomic()
    def create(self, request, *args, **kwargs):
        """
        Perform to create a new task.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        user = self.request.user
        people_in_charge_ids = serializer_data.pop("people_in_charge_ids", None)
        tag_ids = serializer_data.pop("tag_ids", None)
        todo_list = serializer_data.pop("todo_list", None)
        task_schedules = serializer_data.pop("task_schedules", None)
        send_to_chat = serializer_data.pop("send_to_chat", None)
        serializer_data.pop("chat_room_code", None)
        copy_task = serializer_data.pop("copy_task", None)
        organization = serializer_data.get("organization", None)
        is_team_task = serializer_data.pop("is_team_task", None)
        company = user.company
        categories = serializer_data.pop("category_ids", None)
        task_type = serializer_data.get("type", None)
        remind_countdown = serializer_data.pop("remind_countdown", None)
        remind_type = serializer_data.pop("remind_type", None)
        show_deadline_time = serializer_data.pop("show_deadline_time", None)
        # Item for loop task schedule
        plan_start_date = serializer_data.pop("plan_start_date", None)
        plan_end_date = serializer_data.pop("plan_end_date", None)
        repeat_type = serializer_data.pop("repeat_type", None)
        repeat_interval = serializer_data.pop("repeat_interval", None)
        week_day = serializer_data.pop("week_day", None)
        month_day = serializer_data.pop("month_day", None)
        month = serializer_data.pop("month", None)
        task_schedule_from_date = serializer_data.pop(
            "task_schedule_from_date", None
        )
        task_schedule_end_date = serializer_data.pop(
            "task_schedule_end_date", None
        )

        # Implement create task template base on T146
        if task_type == TaskTypes.MY_TEMPLATE.value:
            serializer_data["status"] = TaskStatusModel.objects.filter(
                name=TaskStatus.NOT_STARTED.value
            ).first()
            task_schedules = None
            serializer_data["deadline"] = None

        if serializer_data["status"] == TaskStatus.MY_ROUTINE.value:
            serializer_data["deadline"] = None

        if serializer_data.get("deadline") and remind_countdown and remind_type:
            serializer_data["remind_at"] = calculate_new_time(
                serializer_data["deadline"], remind_countdown, remind_type
            )
        serializer_data["reminds"] = {
            "type": remind_type,
            "countdown": remind_countdown,
            "show_deadline_time": show_deadline_time
            if show_deadline_time
            else False,
        }

        if repeat_type:
            serializer_data["recurring"] = {
                "repeat_type": repeat_type,
                "plan_start_date": plan_start_date.isoformat()
                if plan_start_date
                else None,
                "plan_end_date": plan_end_date.isoformat()
                if plan_end_date
                else None,
                "repeat_interval": repeat_interval,
                "week_day": week_day,
                "month_day": month_day,
                "month": month,
            }

        task = serializer.save(company=company, created_by=user)

        # Handle task schedules creation
        if task_schedules is not None:
            for data in task_schedules:
                create_task_schedule(task, data)

        # Handle todo list creation
        if todo_list is not None:
            for data in todo_list:
                create_todo_list_for_task(
                    current_user=user, task=task, todo_data=data
                )

        # Create people in charge task
        if people_in_charge_ids is not None:
            for item in people_in_charge_ids:
                user_in_charge = item["people_in_charge"]
                task.people_in_charge.add(
                    user_in_charge,
                    through_defaults={"company": company},
                )
                reset_sort_task(user_in_charge)
                if copy_task:
                    # Handle index for my task
                    current_task_index = copy_task.task_index.filter(
                        user=user_in_charge
                    ).first()

                    if current_task_index and current_task_index.pin_at is None:
                        task_index_bellow_current_task = (
                            TaskIndex.objects.filter(
                                task__status=task.status,
                                user=user_in_charge,
                                index__lt=current_task_index.index,
                                pin_at__isnull=True,
                            )
                            .order_by("-index")
                            .first()
                        )
                        if task_index_bellow_current_task:
                            new_index = (
                                current_task_index.index
                                + task_index_bellow_current_task.index
                            ) / 2
                        else:
                            new_index = (
                                current_task_index.index - INITIAL_INDEX_VALUE
                            )
                        # Add index of new user of new task
                        TaskIndex.update_index_for_user(
                            user=user_in_charge,
                            task=task,
                            is_update=False,
                            index=new_index,
                        )
                    else:
                        TaskIndex.update_max_index_for_user(
                            user=user_in_charge, task=task, is_update=False
                        )

                else:
                    # Create new index for task created with user
                    TaskIndex.objects.create(task=task, user=user_in_charge)

        if organization:
            for user_company in company.users.all():
                if TeamTaskIndex.objects.filter(
                    team=organization, user=user_company
                ).exists():
                    # Create new index for team task created with user
                    TeamTaskIndex.objects.create(
                        task=task, user=user_company, team=organization
                    )

        # Handle send to chat
        if send_to_chat:
            self._send_to_chat(
                user,
                task,
                people_in_charge_ids,
                ChatMessageTypes.CREATION_TASK.value,
            )

        # Create tag in task
        if tag_ids is not None:
            for item in tag_ids:
                task.tags.add(
                    item["tag"],
                    through_defaults={"company": company},
                )
        # Create or update categories
        if categories is not None:
            create_categories_by_model(task, categories)
        # Create task schedule base on repeat
        if repeat_type and task.status.name == TaskStatus.MY_ROUTINE.value:
            self._generate_loop_task_schedules(
                task,
                plan_start_date,
                repeat_type,
                repeat_interval,
                week_day,
                month_day,
                plan_end_date,
                month,
            )
        # Increase measure count if task created have status completed
        if task.status.name == TaskStatus.COMPLETED.value:
            for user in task.people_in_charge.all():
                calculate_progress_skill_map(
                    task,
                    user,
                    case=CalculateSkillMapProcessCases.NOT_CHANGE_COMPLETED_STATUS.value,
                )

        return self.response_created(
            self.get_serializer(
                task,
                context={
                    "request": request,
                    "task_schedule_from_date": task_schedule_from_date,
                    "task_schedule_end_date": task_schedule_end_date,
                    "organization_id": organization.id
                    if is_team_task
                    else None,
                },
            ).data
        )

    def _generate_loop_task_schedules(
        self,
        task,
        start_date,
        repeat_type,
        repeat_interval=1,
        weekday=None,
        month_day=None,
        end_date=None,
        month=None,
        old_recurring=None,
    ):
        """
        Handle loop task and store in task schedule
        """
        start_date = (
            make_aware(start_date)
            if isinstance(start_date, datetime)
            else now()
        )

        if repeat_type == FrequencyMap.ONCE.value:
            return
        end_time = end_date.timetz()

        # Make rule repeat
        rule_params = {
            "freq": FrequencyMap.to_rrule(FrequencyMap[repeat_type]),
            "interval": repeat_interval,
            "dtstart": start_date,
        }

        if repeat_type == FrequencyMap.WEEKLY.value and weekday is not None:
            rule_params["byweekday"] = weekday
            days_ahead = (weekday - start_date.weekday()) % 7
            rule_params["dtstart"] = start_date + timedelta(days=days_ahead)
        elif (
            repeat_type == FrequencyMap.MONTHLY.value and month_day is not None
        ):
            rule_params["bymonthday"] = month_day
            if month_day >= start_date.day:
                rule_params["dtstart"] = start_date.replace(day=month_day)
            else:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day
                ) + timedelta(days=30)
        elif (
            repeat_type == FrequencyMap.YEARLY.value
            and month is not None
            and month_day is not None
        ):
            rule_params["bymonth"] = month
            if month >= start_date.month:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day, month=month
                )
            else:
                rule_params["dtstart"] = start_date.replace(
                    day=month_day, month=month
                ) + timedelta(days=LIMIT_DAY + 1)

        rule_params["until"] = (
            rule_params["dtstart"] + timedelta(days=LIMIT_DAY)
            if repeat_type != FrequencyMap.YEARLY.value
            else rule_params["dtstart"]
        )  # Set default end_date is 1 year
        rule = rrule.rrule(**rule_params)
        schedules = []
        if not old_recurring:
            task.task_schedules.all().delete()
        if task.task_schedules.exists():
            list_task_schedule_edited = None
            if (
                old_recurring
                and old_recurring.get("plan_start_date")
                and old_recurring.get("plan_end_date")
            ):
                plan_start_time = datetime.strptime(
                    old_recurring["plan_start_date"], "%Y-%m-%dT%H:%M:%S"
                ).timetz()
                plan_end_time = datetime.strptime(
                    old_recurring["plan_end_date"], "%Y-%m-%dT%H:%M:%S"
                ).timetz()
                # Check edited schedules
                list_task_schedule_edited = task.task_schedules.filter(
                    Q(plan_start_date__lt=now())
                    | Q(
                        ~Q(plan_start_date__time=plan_start_time)
                        & ~Q(plan_end_date__time=plan_end_time)
                    )
                )
            # Remove task schedules not edited
            task.task_schedules.exclude(
                id__in=list_task_schedule_edited.values_list("id", flat=True)
                if list_task_schedule_edited
                else []
            ).delete()
            for occurrence in rule:
                plan_end_date = datetime.combine(
                    occurrence.date(), end_time, occurrence.tzinfo
                )
                # Check not have task edited in the day
                if not list_task_schedule_edited.filter(
                    Q(plan_start_date__date=occurrence.date())
                    & Q(plan_end_date__date=occurrence.date())
                ).exists():
                    schedules.append(
                        TaskSchedule(
                            task=task,
                            company=task.company,
                            plan_start_date=occurrence,
                            plan_end_date=plan_end_date,
                        )
                    )
        else:
            for occurrence in rule:
                plan_end_date = datetime.combine(
                    occurrence.date(), end_time, occurrence.tzinfo
                )
                schedules.append(
                    TaskSchedule(
                        task=task,
                        company=task.company,
                        plan_start_date=occurrence,
                        plan_end_date=plan_end_date,
                    )
                )

        TaskSchedule.objects.bulk_create(schedules)

    def _send_chat_message(
        self,
        participants,
        user,
        message_data,
        can_send_to_self_room=False,
        send_to_chat=True,
    ):
        """
        Handle send chat message to participant
        """
        socketEventType = (
            WebSocketEventType.MESSAGE.value
            if send_to_chat
            else WebSocketEventType.EDIT_MESSAGE.value
        )
        can_send_to_self_room = can_send_to_self_room if send_to_chat else True
        for participant in participants:
            print(
                can_send_to_self_room,
                participant == user,
            )
            if participant == user and not can_send_to_self_room:
                continue
            print("hej ehj ")
            chat_room_participant = participant.chat_rooms_participants.filter(
                chat_room__type=ChatRoomTypes.TASK.value,
                company_id=participant.company_id,
            ).first()

            if not chat_room_participant:
                return
            else:
                chat_room = chat_room_participant.chat_room
            if send_to_chat:
                message = chat_room.chat_messages.create(**message_data)
                chat_room_participant.unread_messages = (
                    chat_room_participant.unread_messages + 1
                )
                chat_room_participant.save()
            else:
                message = chat_room.chat_messages.filter(
                    task=message_data["task"]
                ).first()

            send_web_socket_event(
                {
                    "client_id": None,
                    "action": socketEventType,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        chat_room_participant
                    ).data,
                    "chat_message": ChatMessageSerializer(message).data,
                },
                chat_room_participant,
            )

    def _send_to_chat(
        self, user, task, people_in_charges, task_action=None, send_to_chat=True
    ):
        """
        Handle send to chat of user
        """
        message_data = {
            "sender": user,
            "company": user.company,
            "task": task,
            "type": ChatMessageTypes.CREATION_TASK.value,
            "organization": task.organization,
        }
        current_people = [
            people_in_charge.user
            for people_in_charge in task.people_in_charge_tasks.all()
        ]
        message_data["schedule_changes"] = {
            "task": {"id": task.id, "title": task.title},
        }
        # Edit or create from kanban
        if task_action == ChatMessageTypes.EDIT_TASK.value:
            # Unique element in list people
            unique_people = list(set(people_in_charges))
            delete_peoples = list(set(current_people) - set(unique_people))
            add_peoples = list(set(unique_people) - set(current_people))
            if delete_peoples and add_peoples:
                message_data["schedule_changes"].update(
                    {
                        "old_member": CreationDataUserSerializer(
                            delete_peoples[0]
                        ).data,
                        "new_member": CreationDataUserSerializer(
                            add_peoples[0]
                        ).data,
                    }
                )
            # Handle websocket to removed people
            if delete_peoples:
                message_data["type"] = ChatMessageTypes.REMOVE_MEMBER_TASK.value
                self._send_chat_message(
                    participants=delete_peoples,
                    user=user,
                    message_data=message_data,
                )
            if add_peoples:
                message_data["type"] = ChatMessageTypes.ADD_MEMBER_TASK.value
                self._send_chat_message(
                    participants=add_peoples,
                    user=user,
                    message_data=message_data,
                    can_send_to_self_room=True,
                )
            if not delete_peoples and not add_peoples:
                message_data["type"] = task_action
                self._send_chat_message(
                    participants=current_people,
                    user=user,
                    message_data=message_data,
                    send_to_chat=send_to_chat,
                )
        elif task_action == ChatMessageTypes.REMOVE_TASK.value:
            message_data["type"] = task_action
            self._send_chat_message(
                participants=current_people,
                user=user,
                message_data=message_data,
            )
        else:
            self._send_chat_message(
                participants=current_people,
                user=user,
                message_data=message_data,
            )

    @extend_schema(
        parameters=[
            OpenApiParameter("task_schedule_from_date", type=datetime),
            OpenApiParameter("task_schedule_end_date", type=datetime),
        ]
    )
    def retrieve(self, request, *args, **kwargs):
        """
        Handle updating the count of task usage by the user.
        """
        task = self.get_object()
        user = request.user
        task_schedule_from_date = request.query_params.get(
            "task_schedule_from_date"
        )
        task_schedule_end_date = request.query_params.get(
            "task_schedule_end_date"
        )
        task_schedule_from_date = (
            validate_date_by_regex_and_reformat(task_schedule_from_date)
            if task_schedule_from_date
            else None
        )
        task_schedule_end_date = (
            validate_date_by_regex_and_reformat(task_schedule_end_date)
            if task_schedule_end_date
            else None
        )
        # Retrieve or create TaskFrequent and set the default company
        task_frequent, created = TaskFrequent.objects.get_or_create(
            user=user, task=task, defaults={"company_id": task.company_id}
        )

        # Increment the count if it's not a newly created instance
        if not created:
            task_frequent.count += 1
            task_frequent.save()

        return self.response_ok(
            self.get_serializer(
                task,
                context={
                    "request": request,
                    "task_schedule_from_date": task_schedule_from_date,
                    "task_schedule_end_date": task_schedule_end_date,
                },
            ).data
        )

    @transaction.atomic()
    def update(self, request, *args, **kwargs):
        """
        Perform to update a task.
        """
        user = self.request.user
        current_task = self.get_object()
        old_task_updated = current_task.updated_at
        current_task_status = current_task.status
        current_org = current_task.organization
        serializer = self.get_serializer(
            current_task, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        people_in_charge_ids = serializer_data.pop("people_in_charge_ids", None)
        tag_ids = serializer_data.pop("tag_ids", None)
        task_status = serializer_data.get("status", None)
        is_exists_task_schedules = "task_schedules" in serializer_data
        is_exists_categories = "category_ids" in serializer_data
        task_schedules = serializer_data.pop("task_schedules", None)
        todo_list = serializer_data.pop("todo_list", None)
        categories = serializer_data.pop("category_ids", None)
        organization = serializer_data.get(
            "organization", current_task.organization
        )
        is_team_task = serializer_data.pop("is_team_task", None)
        # Get data for send to chat
        send_to_chat = serializer_data.pop("send_to_chat", None)
        serializer_data.pop("chat_room_code", None)
        serializer_data.get("type", None)
        remind_countdown = serializer_data.pop("remind_countdown", None)
        remind_type = serializer_data.pop("remind_type", None)
        show_deadline_time = serializer_data.pop("show_deadline_time", None)
        # Item for loop task schedule
        is_exists_repeat = "repeat_type" in serializer_data
        plan_start_date = serializer_data.pop("plan_start_date", None)
        plan_end_date = serializer_data.pop("plan_end_date", None)
        repeat_type = serializer_data.pop("repeat_type", None)
        repeat_interval = serializer_data.pop("repeat_interval", None)
        week_day = serializer_data.pop("week_day", None)
        month_day = serializer_data.pop("month_day", None)
        month = serializer_data.pop("month", None)
        task_schedule_from_date = serializer_data.pop(
            "task_schedule_from_date", None
        )
        task_schedule_end_date = serializer_data.pop(
            "task_schedule_end_date", None
        )
        old_recurring = current_task.recurring
        # Implement create task template base on T146
        if current_task.type == TaskTypes.MY_TEMPLATE.value:
            if task_status and task_status.name != TaskStatus.NOT_STARTED.value:
                serializer_data["status"] = TaskStatusModel.objects.filter(
                    name=TaskStatus.NOT_STARTED.value
                ).first()
            task_schedules = None
            serializer_data["deadline"] = None
        else:
            if (
                current_task_status.name == TaskStatus.MY_ROUTINE.value
                and task_status
                and task_status.name == TaskStatus.MY_ROUTINE.value
            ):
                serializer_data["deadline"] = None

        if serializer_data.get("deadline"):
            serializer_data["reminds"] = {
                "type": remind_type,
                "countdown": remind_countdown,
                "show_deadline_time": show_deadline_time
                if show_deadline_time
                else False,
            }
            if remind_countdown and remind_type:
                serializer_data["remind_at"] = calculate_new_time(
                    serializer_data["deadline"], remind_countdown, remind_type
                )
        elif serializer_data.get("deadline") is None:
            serializer_data["reminds"] = {
                "type": None,
                "countdown": None,
                "show_deadline_time": show_deadline_time
                if show_deadline_time
                else False,
            }
        if (
            (current_task_status.name != TaskStatus.MY_ROUTINE.value)
            and (current_task.deadline != serializer_data.get("deadline"))
            or (
                user.setting.is_sorting_task_by_important
                and current_task.is_important
                != serializer_data.get("is_important")
            )
        ):
            reset_sort_task(user)

        if is_exists_repeat:
            serializer_data["recurring"] = {
                "repeat_type": repeat_type,
                "plan_start_date": plan_start_date.isoformat()
                if plan_start_date
                else None,
                "plan_end_date": plan_end_date.isoformat()
                if plan_end_date
                else None,
                "repeat_interval": repeat_interval,
                "week_day": week_day,
                "month_day": month_day,
                "month": month,
            }
        else:
            serializer_data["recurring"] = None
        if (
            (current_task_status.name != TaskStatus.MY_ROUTINE.value)
            and serializer_data.get("status")
            and (
                serializer_data.get("status").name
                == TaskStatus.MY_ROUTINE.value
            )
        ):
            serializer_data["recurring"] = {
                "repeat_type": FrequencyMap.ONCE.value,
                "plan_start_date": None,
                "plan_end_date": None,
                "repeat_interval": None,
                "week_day": None,
                "month_day": None,
                "month": None,
            }
        # Update task
        task = serializer.save()

        # Handle send to chat
        people_in_charges = [
            item["people_in_charge"] for item in people_in_charge_ids
        ]
        if send_to_chat:
            self._send_to_chat(
                user,
                current_task,
                people_in_charges,
                ChatMessageTypes.EDIT_TASK.value,
            )
        else:
            print("ere")
            self._send_to_chat(
                user,
                current_task,
                people_in_charges,
                ChatMessageTypes.EDIT_TASK.value,
                False,
            )

        if (
            is_exists_repeat
            and old_recurring
            and task.status.name == TaskStatus.MY_ROUTINE.value
        ) and (
            (
                old_recurring["repeat_type"] == FrequencyMap.ONCE.value
                and repeat_type != FrequencyMap.ONCE.value
            )
            or (
                old_recurring["repeat_type"] != FrequencyMap.ONCE.value
                and repeat_type == FrequencyMap.ONCE.value
            )
        ):
            task.task_schedules.all().delete()
        if (
            is_exists_repeat
            and old_recurring
            and task.status.name == TaskStatus.MY_ROUTINE.value
            and task.recurring != old_recurring
            and repeat_type is None
        ):
            task.task_schedules.all().delete()
            task.recurring = {}
            task.save()
        if is_exists_task_schedules and task_schedules is None:
            task.task_schedules.all().delete()

        # Handle task schedules creation
        if (task_schedules is not None) or (
            task_schedules is not None
            and repeat_type == FrequencyMap.ONCE.value
        ):
            # Get all existing task schedule IDs for the current task
            old_task_schedule_ids = set(
                current_task.task_schedules.values_list("id", flat=True)
            )
            new_task_schedule_ids = set()

            for data in task_schedules:
                schedule = data.pop(
                    "schedule_id", None
                )  # Get the schedule_id from the incoming data

                if (
                    schedule
                    and isinstance(schedule, TaskSchedule)
                    and schedule.id in old_task_schedule_ids
                ):
                    # Handle update: If the schedule exists, update it
                    update_task_schedule(schedule, data)
                    new_task_schedule_ids.add(schedule.id)

                elif schedule is None:
                    # Handle create: If no schedule_id is present, create a new schedule
                    create_task_schedule(current_task, data)

            # Handle delete: Find schedules that are in the old list but not in the new list
            schedules_to_delete = old_task_schedule_ids - new_task_schedule_ids
            delete_task_schedules(schedules_to_delete)

        # Handle task todo list creation
        if todo_list is not None:
            # Get all existing task todo list IDs for the current task
            old_todo_list_ids = set(
                current_task.todo_list.values_list("id", flat=True)
            )
            new_todo_list_ids = set()

            for data in todo_list:
                todo_list = data.pop(
                    "todo_list_id", None
                )  # Get the todo_list_id from the incoming data

                if (
                    todo_list
                    and isinstance(todo_list, TodoList)
                    and todo_list.id in old_todo_list_ids
                ):
                    # Handle update: If the todo_list exists, update it
                    update_todo_list_for_task(todo_list, data)
                    new_todo_list_ids.add(todo_list.id)

                elif todo_list is None:
                    # Handle create: If no todo_list_id is present, create a new todo_list
                    create_todo_list_for_task(
                        current_user=user, task=task, todo_data=data
                    )

            # Handle delete: Find todo_lists that are in the old list but not in the new list
            todo_list_to_delete = old_todo_list_ids - new_todo_list_ids
            delete_todo_list_for_task(todo_list_to_delete)

        # Define variable to check change data (handling TeamTaskIndex)
        change_people_in_charge = set()
        current_people_in_charge = set(current_task.people_in_charge.all())
        is_change_status = False

        # Update to last index if change status
        if (
            current_task_status is not None
            and task_status is not None
            and current_task_status != task_status
        ):
            is_change_status = True
            for user in current_people_in_charge:
                send_web_socket_event(
                    {
                        "action": WebSocketEventType.CHANGE_TASK_STATUS.value,
                        "task": TaskCommonSerializer(
                            task, context={"request": self.request}
                        ).data,
                    },
                    user,
                )
                TaskIndex.update_max_index_for_user(
                    user=user, task=task, is_update=True
                )
                task_index = TaskIndex.objects.filter(
                    user=user, task=task
                ).first()
                reset_sort_task(user)
                # Reset pin at to now
                if task_index and task_index.pin_at:
                    task_index.pin_at = timezone.now()
                    task_index.save()

        # Update people in charge task
        if people_in_charge_ids is not None:
            # Delete index for task if remove user
            TaskIndex.objects.filter(task=task).exclude(
                user_id__in=[
                    item["people_in_charge"].id for item in people_in_charge_ids
                ]
            ).delete()

            # Check if the task has started working
            is_task_started = task.task_durations.filter(
                paused_at__isnull=True
            ).exists()

            # Remove all old people in charge and add new users in charge.
            task.people_in_charge.clear()
            for item in people_in_charge_ids:
                user = item["people_in_charge"]

                # Detect change people in charge
                change_people_in_charge.add(user)

                # Make sure that user hasn't tasks started
                if is_task_started:
                    user_task_ids = PeopleInChargeTasks.objects.filter(
                        user=user.id
                    ).values_list("task", flat=True)

                    if TaskDuration.objects.filter(
                        task__in=user_task_ids, paused_at__isnull=True
                    ).exists():
                        raise ValidationError(
                            {
                                "detail": {
                                    "id": user.id,
                                    "detail": ERROR_MESSAGES[
                                        "people_in_charge_has_task_started"
                                    ].format(id=user.id),
                                }
                            }
                        )

                # Add new users in charge.
                task.people_in_charge.add(
                    user,
                    through_defaults={
                        "company_id": self.request.user.company_id
                    },
                )

                # Update last index if add new user
                TaskIndex.update_max_index_for_user(
                    user=user, task=task, is_update=False
                )
        elif people_in_charge_ids == []:
            task.people_in_charge.clear()
            TaskIndex.objects.filter(task=task).delete()

        """
        Update the highest index for the task being edited for all users
        in the team (task is at the top).
        """
        if (
            current_org != organization
            or is_change_status
            or current_people_in_charge != change_people_in_charge
        ):
            # If the team is changed, then delete all indexes of the old team.
            if current_org != organization:
                TeamTaskIndex.objects.filter(
                    team=current_org, task=task
                ).delete()

            # Update the max index for the task for all usersx
            for user in self.request.user.company.users.all():
                if TeamTaskIndex.objects.filter(
                    team=organization, user=user
                ).exists():
                    # Update last index team task if add new user
                    TeamTaskIndex.update_max_index_for_user(
                        team=organization, user=user, task=task, is_update=False
                    )
                    team_task_index = TeamTaskIndex.objects.filter(
                        team=organization, user=user, task=task
                    ).first()
                    # Reset pin at to now
                    if team_task_index and team_task_index.pin_at:
                        team_task_index.pin_at = timezone.now()
                        team_task_index.save()

        # Update tags in task
        if tag_ids is not None:
            # Remove all old tags and add new tag in request.
            task.tags.clear()
            for item in tag_ids:
                task.tags.add(
                    item["tag"],
                    through_defaults={
                        "company_id": self.request.user.company_id
                    },
                )
        elif tag_ids == []:
            task.tags.clear()

        # Check is task run overtime or not
        start_of_today = datetime.combine(timezone.now().date(), time.min)
        task_duration = TaskDuration.objects.filter(
            started_at__gte=start_of_today, paused_at__isnull=True, task=task
        ).first()
        if task_duration:
            is_send_sk, is_over_estimate = check_task_overtime(
                task, task_duration
            )
            for user in task.people_in_charge.all():
                send_web_socket_event(
                    {
                        "id": task.id,
                        "task_duration_running_uuid": str(task_duration.uuid),
                        "is_over_estimate": is_over_estimate,
                        "action": WebSocketEventType.DURATION_OVERTIME_WARNING.value,
                        "type": CalendarTypes.TASK.value,
                    },
                    user=user,
                )
        # Create task schedule base on repeat
        if (
            task.status.name == TaskStatus.MY_ROUTINE.value
            and repeat_type
            and task.recurring
            and task.recurring != old_recurring
        ):
            self._generate_loop_task_schedules(
                task,
                plan_start_date,
                repeat_type,
                repeat_interval,
                week_day,
                month_day,
                plan_end_date,
                month,
                old_recurring=old_recurring,
            )

        # Determine the skill update case based on task status change
        previous = current_task_status.name
        current = task.status.name
        completed = TaskStatus.COMPLETED.value
        case = None
        if previous != completed and current == completed:
            case = (
                CalculateSkillMapProcessCases.CHANGE_ANOTHER_TO_COMPLETED_STATUS.value
            )
        elif previous == completed and current != completed:
            case = (
                CalculateSkillMapProcessCases.CHANGE_COMPLETED_STATUS_TO_ANOTHER.value
            )
        elif previous == current == completed:
            case = (
                CalculateSkillMapProcessCases.NOT_CHANGE_COMPLETED_STATUS.value
            )
        elif previous == current and current != completed:
            case = CalculateSkillMapProcessCases.NOT_CHANGE_STATUS.value

        # Create or update categories
        if is_exists_categories and not compare_list_categories(
            categories, get_common_categories(task.categories.first())
        ):
            for user in task.people_in_charge.all():
                # Minus skill map process have old categories of current task
                calculate_progress_skill_map(
                    current_task,
                    user,
                    is_minus=True,
                    case=case,
                    organization=current_org,
                )
            # Update new categories
            create_categories_by_model(task, categories)
            for user in task.people_in_charge.all():
                # Plus skill map process have new categories of updated task
                calculate_progress_skill_map(
                    task, user, case=case, old_task_updated=old_task_updated
                )
        elif (
            previous != completed
            and current == completed
            or previous == completed
            and current != completed
        ):

            is_minus = previous == completed and current != completed
            for user in task.people_in_charge.all():
                calculate_progress_skill_map(
                    task, user, is_minus=is_minus, case=case
                )

        return self.response_ok(
            self.get_serializer(
                task,
                context={
                    "request": request,
                    "task_schedule_from_date": task_schedule_from_date,
                    "task_schedule_end_date": task_schedule_end_date,
                    "organization_id": organization.id
                    if is_team_task
                    else None,
                },
            ).data
        )

    def destroy(self, request, *args, **kwargs):
        """
        Handle destroying the task
        """
        instance = self.get_object()
        current_screen = request.query_params.get("current_screen")
        if current_screen == Screens.TEAMDOCK.value:
            self._send_to_chat(
                request.user,
                instance,
                instance.people_in_charge,
                ChatMessageTypes.REMOVE_TASK.value,
            )
        if instance.task_durations.exists():
            instance.task_durations.filter(paused_at__isnull=True).update(
                paused_at=now()
            )
            instance.is_start = False
            instance.save()
            instance.soft_delete()
        else:
            instance.delete()
        reset_sort_task(request.user)

        return self.response(status_code=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        parameters=[OpenApiParameter("page_size", type=int)],
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                response=TaskBoardSerializer(many=True)
            )
        },
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="frequent",
        serializer_class=TaskBoardSerializer,
    )
    def frequent(self, request):
        """
        Get the top tasks with the highest counts for the logged-in user.
        """
        # Get page_size from query params
        user = request.user
        page_size = request.query_params.get("page_size", DEFAULT_PAGE_SIZE)

        try:
            page_size = int(page_size)
        except (TypeError, ValueError):
            page_size = DEFAULT_PAGE_SIZE

        if page_size <= 0:
            page_size = DEFAULT_PAGE_SIZE

        frequent_tasks = (
            TaskFrequent.objects.filter(
                user=user,
                company_id=user.company_id,
                task__people_in_charge__id=user.id,
            )
            .order_by("-count")
            .prefetch_related("task")[:page_size]
        )
        tasks = [item.task for item in frequent_tasks]

        return self.response_ok(
            TaskBoardSerializer(
                tasks, many=True, context={"request": request}
            ).data
        )

    @action(
        methods=["GET"],
        detail=False,
        url_path="template",
        serializer_class=TaskTemplateSerializer,
    )
    def template(self, request):
        """
        Get all the task template by logged user
        """
        user = request.user
        people_in_charge_tasks = (
            user.people_in_charge_tasks.filter(
                task__type=TaskTypes.MY_TEMPLATE.value
            )
            .all()
            .order_by("task_id")
        )
        data = []
        for people_in_charge_task in people_in_charge_tasks:
            data.append(TaskTemplateSerializer(people_in_charge_task.task).data)

        return self.response_ok(data)

    @action(
        methods=["PUT"],
        detail=False,
        url_path="index",
        serializer_class=TaskIndexForCreationSerializer,
    )
    @transaction.atomic()
    def index(self, request):
        """
        Create multiple TaskIndex instances based on the provided data.
        """
        # Initialize the serializer with request data
        serializer = TaskIndexForCreationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # Validate the data
        validated_data = serializer.validated_data
        current_screen = request.query_params.get("current_screen")
        # Extract tasks from validated data
        tasks_data = validated_data.get("tasks", [])

        # Validate and save each task
        for item in tasks_data:
            task = item.get("task")
            user = item.get("user")
            team = item.get("team")
            people_in_charge = item.pop("people_in_charge", [])
            task_status = item.pop("status", None)
            is_begin_unpin = item.pop("is_begin_unpin")

            # Create or update TaskIndex based on the presence of user or team
            if user:
                if is_begin_unpin:
                    max_task_index = TaskIndex.objects.filter(
                        user=user, task__status=task.status, pin_at__isnull=True
                    ).aggregate(Max("index"))["index__max"]
                    item["index"] = (
                        (max_task_index + INITIAL_INDEX_VALUE)
                        if max_task_index
                        else INITIAL_INDEX_VALUE
                    )

                item.pop("team", None)
                TaskIndex.objects.update_or_create(
                    task=task, user=user, defaults=item
                )
                reset_sort_task(user)
            elif team:
                if is_begin_unpin:
                    task_filter = filter_task_index_team(task)
                    max_task_index = (
                        TeamTaskIndex.objects.filter(
                            user=request.user, team=team, pin_at__isnull=True
                        )
                        .filter(task_filter)
                        .aggregate(Max("index"))["index__max"]
                    )
                    item["index"] = (
                        (max_task_index + INITIAL_INDEX_VALUE)
                        if max_task_index
                        else INITIAL_INDEX_VALUE
                    )

                item.pop("user", None)
                TeamTaskIndex.objects.update_or_create(
                    user=request.user, task=task, team=team, defaults=item
                )
            else:
                return self.response(status_code=status.HTTP_400_BAD_REQUEST)

            if people_in_charge is None:
                # Handle send to chat when in teamdock
                if current_screen == Screens.TEAMDOCK.value:
                    self._send_to_chat(
                        request.user,
                        task,
                        task.people_in_charge,
                        ChatMessageTypes.REMOVE_TASK.value,
                    )
                task.people_in_charge.clear()
                # Delete index for task if change people in charge
                TaskIndex.objects.filter(task=task).delete()
            elif people_in_charge:
                # Handle send to chat when in teamdock
                if current_screen == Screens.TEAMDOCK.value:
                    self._send_to_chat(
                        request.user,
                        task,
                        [people_in_charge],
                        ChatMessageTypes.EDIT_TASK.value,
                    )

                task.people_in_charge.set(
                    [people_in_charge],
                    through_defaults={"company": task.company},
                )
                # Delete index for task if change people in charge
                TaskIndex.objects.filter(task=task).exclude(
                    user_id=people_in_charge
                ).delete()

                # Update last index if add new user
                TaskIndex.update_max_index_for_user(
                    user=people_in_charge, task=task, is_update=False
                )

            if task_status:
                if (task_status.name == TaskStatus.MY_ROUTINE.value) and (
                    task.status.name != TaskStatus.MY_ROUTINE.value
                ):
                    task.recurring = {
                        "repeat_type": FrequencyMap.ONCE.value,
                        "plan_start_date": None,
                        "plan_end_date": None,
                        "repeat_interval": None,
                        "week_day": None,
                        "month_day": None,
                        "month": None,
                    }
                old_task_status = task.status.name
                task.status = task_status
                task.save()
                is_change_another_to_complete_status = (
                    old_task_status != TaskStatus.COMPLETED.value
                    and task_status.name == TaskStatus.COMPLETED.value
                )
                is_change_complete_to_another_status = (
                    old_task_status == TaskStatus.COMPLETED.value
                    and task_status.name != TaskStatus.COMPLETED.value
                )
                if (
                    is_change_another_to_complete_status
                    or is_change_complete_to_another_status
                ):
                    if is_change_another_to_complete_status:
                        case = (
                            CalculateSkillMapProcessCases.CHANGE_ANOTHER_TO_COMPLETED_STATUS.value
                        )
                        minus = False
                    else:
                        case = (
                            CalculateSkillMapProcessCases.CHANGE_COMPLETED_STATUS_TO_ANOTHER.value
                        )
                        minus = True
                    for user in task.people_in_charge.all():
                        calculate_progress_skill_map(
                            task, user, is_minus=minus, case=case, is_plus=False
                        )
                for user in task.people_in_charge.all():
                    send_web_socket_event(
                        {
                            "action": WebSocketEventType.CHANGE_TASK_STATUS.value,
                            "task": TaskCommonSerializer(
                                task, context={"request": self.request}
                            ).data,
                        },
                        user,
                    )

            """
            Update the max index for the task that was dragged and dropped
            by other users in the team.
            """
            if team:
                for user in team.company.users.exclude(
                    id=request.user.id
                ).all():
                    if TeamTaskIndex.objects.filter(
                        team=team, user=user
                    ).exists():
                        # Update last index team task if add new user
                        TeamTaskIndex.update_max_index_for_user(
                            team=team, user=user, task=task, is_update=False
                        )
                        team_task_index = TeamTaskIndex.objects.filter(
                            team=team, user=user, task=task
                        ).first()
                        # Reset pin at to now
                        if team_task_index and team_task_index.pin_at:
                            team_task_index.pin_at = timezone.now()
                            team_task_index.save()

        return self.response_ok()

    @action(
        methods=["PUT"],
        detail=True,
        url_path="pin",
        serializer_class=TaskIndexPinAtSerializer,
    )
    @transaction.atomic()
    def pin(self, request, pk):
        """
        Pin task
        """
        task = self.get_object()
        user = request.user

        # Validate the incoming data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        pin_at = serializer_data.get("pin_at")
        team = serializer_data.get("team")

        if team:
            task_index = TeamTaskIndex.objects.filter(
                task=task, team=team, user=user
            ).first()
        else:
            task_index = TaskIndex.objects.filter(task=task, user=user).first()

        if not task_index:
            raise ValidationError({"detail": ERROR_MESSAGES["task_not_exists"]})

        if task_index.pin_at is None and pin_at:
            task_index.pin_at = pin_at
        else:
            task_index.pin_at = None

            if team:
                task_filter = filter_task_index_team(task)
                max_task_index = (
                    TeamTaskIndex.objects.filter(
                        user=request.user, team=team, pin_at__isnull=True
                    )
                    .filter(task_filter)
                    .aggregate(Max("index"))["index__max"]
                )
                task_index.index = (
                    (max_task_index + INITIAL_INDEX_VALUE)
                    if max_task_index
                    else INITIAL_INDEX_VALUE
                )
            else:
                max_task_index = TaskIndex.objects.filter(
                    user=user, task__status=task.status, pin_at__isnull=True
                ).aggregate(Max("index"))["index__max"]
                task_index.index = (
                    (max_task_index + INITIAL_INDEX_VALUE)
                    if max_task_index
                    else INITIAL_INDEX_VALUE
                )

        task_index.save()

        if not team:
            reset_sort_task(user)

        result = None
        if team:
            result = TeamTaskIndexSerializer(task_index).data
        else:
            result = TaskIndexSerializer(task_index).data

        return self.response_ok(result)


@extend_schema(tags=["System > Task"])
class TaskCalendarViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint to show Tasks to the Calendar.
    """

    queryset = Task.objects.all()
    serializer_class = TaskCalendarSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
    ]
    filterset_class = TaskCalendarFilter
    pagination_class = None
    screen_name = Screens.MY_TASK.value

    def get_serializer_context(self):
        """
        Get serializer context
        """
        context = super().get_serializer_context()
        context["request"] = self.request

        return context

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        user_id = self.request.query_params.get("user_id")

        if not start_date and not end_date:
            today = datetime.now().date()
            start_date = datetime.combine(today, time.min)
            end_date = datetime.combine(today, time.max)
            queryset = queryset.filter(
                task_schedules__plan_start_date__gte=start_date,
                task_schedules__plan_start_date__lte=end_date,
            ).distinct()

        if not user_id:
            queryset = queryset.filter(people_in_charge__id=user.id)
        if start_date and end_date:
            start_date = datetime.strptime(
                start_date, BASE_DATETIME_FORMAT
            ).date()
            end_date = datetime.strptime(end_date, BASE_DATETIME_FORMAT).date()
            start_date = datetime.combine(start_date, time.min)
            end_date = datetime.combine(end_date, time.max)
            queryset = queryset.filter(
                task_schedules__plan_start_date__gte=start_date,
                task_schedules__plan_start_date__lte=end_date,
            ).distinct()

        return queryset.filter(company_id=user.company_id)


@extend_schema(tags=["System > Task"])
class TaskScheduleViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint to show Tasks to the Calendar.
    """

    queryset = TaskSchedule.objects.order_by("plan_start_date").all()
    serializer_class = TaskScheduleSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        DjangoFilterBackend,
    ]
    filterset_class = TaskScheduleFilter
    pagination_class = None
    lookup_field = "uuid"
    screen_name = Screens.MY_TASK.value

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get("user_id")

        if not user_id:
            queryset = queryset.filter(
                task__people_in_charge__id=self.request.user.id
            )

        if self.action == "list":
            queryset = queryset.filter(
                plan_start_date__gte=datetime.combine(
                    datetime.now().date(), time.min
                )
            ).distinct()

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return TaskScheduleForCreationSerializer

        return super().get_serializer_class()

    def _check_overtime(self, task_schedule):
        """
        Check overtime of task schedule
        """
        start_of_today = datetime.combine(timezone.now().date(), time.min)
        task_duration = TaskDuration.objects.filter(
            started_at__gte=start_of_today,
            paused_at__isnull=True,
            task=task_schedule.task,
        ).first()
        if task_duration:
            is_send_sk, is_over_estimate = check_task_overtime(
                task_schedule.task, task_duration
            )
            for user in task_schedule.task.people_in_charge.all():
                send_web_socket_event(
                    {
                        "id": task_schedule.task.id,
                        "task_duration_running_uuid": str(task_duration.uuid),
                        "is_over_estimate": is_over_estimate,
                        "action": WebSocketEventType.DURATION_OVERTIME_WARNING.value,
                        "type": CalendarTypes.TASK.value,
                    },
                    user=user,
                )

    def perform_create(self, serializer):
        """
        Handle create task schedule
        """
        task_schedule = serializer.save()
        self._check_overtime(task_schedule)

    def perform_update(self, serializer):
        """
        Handle update task schedule
        """
        task_schedule = serializer.save()
        self._check_overtime(task_schedule)

    @action(
        methods=["POST"],
        detail=False,
        url_path="multiple",
        serializer_class=TaskScheduleForCreationMultipleSerializer,
    )
    @transaction.atomic()
    def update_multiple_schedules(self, request):
        """
        Handle update multiple task schedules
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        task_schedules = serializer_data.get("task_schedules")
        for data in task_schedules:
            if uuid := data.get("uuid"):
                task_schedule, _ = TaskSchedule.objects.update_or_create(
                    uuid=uuid,
                    defaults={
                        "task": data.get("task"),
                        "plan_start_date": data.get("plan_start_date"),
                        "plan_end_date": data.get("plan_end_date"),
                    },
                )
                self._check_overtime(task_schedule)
        return self.response_ok()


@extend_schema(tags=["System > Task"])
class TaskBoardViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint to show Tasks to the Board.
    """

    queryset = (
        Task.objects.filter(deleted_at__isnull=True)
        .exclude(type=TaskTypes.MY_TEMPLATE.value)
        .all()
    )
    serializer_class = TaskBoardSerializer
    permission_classes = [ActionPermission]
    screen_name = Screens.MY_TASK.value

    filter_backends = [
        filters.SearchFilter,
        CustomOrderFilter,
        DjangoFilterBackend,
    ]
    ordering_fields = {
        "is_important": "is_important",
        "deadline": "deadline",
        "id": "id",
    }
    filterset_class = TaskBoardFilter
    search_fields = [
        "title",
        "status__name",
        "description",
        "tags__name",
        "people_in_charge__profile__full_name",
    ]
    date_search_fields = [
        "deadline",
        "plan_start_date",
        "plan_end_date",
        "actual_start_date",
        "actual_end_date",
    ]

    def filter_queryset(self, queryset):
        # Default search fields are set before filtering
        self.search_fields = [
            "title",
            "status__name",
            "description",
            "tags__name",
            "people_in_charge__profile__full_name",
        ]
        query_params = self.request.query_params.copy()
        search = query_params.get("search")
        ordering = query_params.get("ordering")

        if parsed_date := parse_search_date(search):
            # Append date fields to search_fields dynamically
            self.search_fields += self.date_search_fields
            # Format search date if any
            query_params["search"] = parsed_date.strftime("%Y-%m-%d")

        # Make sure to sort by ID DESC
        if ordering and "id" not in ordering:
            query_params["ordering"] = f"{ordering},-id"

        self.request._request.GET = query_params
        return super().filter_queryset(queryset)

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().filter(company_id=user.company_id)
        query_params = self.request.query_params
        user_id = query_params.get("user_id")
        ordering = query_params.get("ordering")
        is_team_task = query_params.get("is_team_task", "").lower() == "true"
        organization_id = query_params.get("organization_id")
        is_cross_team_task = (
            query_params.get("is_cross_team_task", "").lower() == "true"
        )

        if is_team_task:
            validate_company_organization(
                user.company_id, organization_id, required_field=True
            )
            # Filter only in organization
            if not is_cross_team_task:
                queryset = queryset.filter(organization_id=organization_id)
        else:
            # Case Mytask: filter only in organization
            if organization_id:
                queryset = queryset.filter(organization_id=organization_id)

        # Filter tasks by the current user if no user_id is provided
        if not user_id:
            queryset = queryset.filter(people_in_charge__id=user.id)

        # Apply custom ordering if 'ordering' parameter is not provided
        if not ordering:
            if is_team_task:
                # Handle load more for team tasks
                task_pin = TeamTaskIndex.objects.filter(
                    task=OuterRef("pk"),
                    team_id=organization_id,
                    user_id=user.id,
                ).values("pin_at")[:1]
                task_index = TeamTaskIndex.objects.filter(
                    task=OuterRef("pk"),
                    team_id=organization_id,
                    user_id=user.id,
                ).values("index")[:1]
            else:
                # Handle load more for my tasks
                task_pin = TaskIndex.objects.filter(
                    task=OuterRef("pk"), user_id=user_id if user_id else user.id
                ).values("pin_at")[:1]
                task_index = TaskIndex.objects.filter(
                    task=OuterRef("pk"), user_id=user_id if user_id else user.id
                ).values("index")[:1]

            # Annotate the queryset with the index from TaskIndex and TeamTaskIndex
            queryset = queryset.annotate(
                index=Subquery(task_index),
                coalesced_pin_at=Coalesce(
                    Subquery(task_pin),
                    Value(REPLACE_NULL_DATE),
                    output_field=DateTimeField(),
                ),
                task_index_pin_at=Subquery(task_pin),
            ).order_by("-coalesced_pin_at", "-index")

            if pin_at := query_params.get("pin_at"):
                queryset = queryset.filter(coalesced_pin_at__lt=pin_at)
            elif index := query_params.get("index"):
                queryset = queryset.filter(
                    index__lt=index, task_index_pin_at__isnull=True
                )
        else:
            # Handle filter when pagination
            if id := query_params.get("task_id") and "deadline" in ordering:
                if deadline := query_params.get("deadline"):
                    queryset = queryset.filter(
                        Q(deadline__gt=deadline) | Q(deadline__isnull=True)
                    )
                else:
                    queryset = queryset.filter(
                        deadline__isnull=True,
                        id__lt=id,
                    )

        # Handle exclude ids when case add, drag drop item
        if ids := query_params.get("ids"):
            if exclude_ids := split_id_from_string(ids):
                queryset = queryset.exclude(id__in=exclude_ids)

        if tag_ids := query_params.get("tag_ids"):
            if ids := split_id_from_string(tag_ids):
                queryset = queryset.filter(tags__id__in=ids)

        if category_ids := query_params.get("category_ids"):
            if ids := split_id_from_string(category_ids):
                queryset = queryset.filter(
                    Q(categories__large_statistic_category__in=ids)
                )

        if organization_ids := query_params.get("organization_ids"):
            if ids := split_id_from_string(organization_ids):
                queryset = queryset.filter(Q(organization__in=ids))

        return queryset.distinct()

    @extend_schema(
        parameters=[
            OpenApiParameter("deadline", type=datetime),
            OpenApiParameter("pin_at", type=datetime),
            OpenApiParameter("task_id", type=int),
            OpenApiParameter("index", type=float),
            OpenApiParameter("ids", type=str),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("is_team_task", type=bool),
            OpenApiParameter("is_cross_team_task", type=bool),
        ],
    )
    def list(self, request, *args, **kwargs):
        """
        Handle get list tasks
        """
        user = request.user
        queryset = self.filter_queryset(self.get_queryset())
        ordering = request.query_params.get("ordering", None)
        status_id = request.query_params.get("status_id", None)
        if ordering:
            task_routine_status = TaskStatusModel.objects.filter(
                name=TaskStatus.MY_ROUTINE.value
            ).first()
            if not (
                "deadline" in ordering
                and int(status_id) == task_routine_status.id
            ):
                queryset = queryset.annotate(
                    coalesced_ordering_datetime=Coalesce(
                        "deadline",
                        Value(REPLACE_NULL_DATE_WITH_FUTURE),
                        output_field=DateTimeField(),
                    )
                )
                if "is_important" in ordering:
                    queryset = queryset.order_by(
                        "-is_important",
                        "coalesced_ordering_datetime",
                        "-updated_at",
                    )
                if "deadline" in ordering:
                    queryset = queryset.order_by(
                        "coalesced_ordering_datetime",
                        "-is_important",
                        "-updated_at",
                    )

                for idx, task in enumerate(queryset):
                    task_index = task.task_index.filter(user=user).first()
                    if not task_index:
                        TaskIndex.update_index_for_user(
                            user, task, False, INITIAL_INDEX_VALUE - idx
                        )
                    else:
                        if task_index.pin_at:
                            task_index.pin_at = timezone.now() - timedelta(
                                minutes=INITIAL_INDEX_VALUE + idx
                            )
                        task_index.index = INITIAL_INDEX_VALUE - idx
                        task_index.save()

            task_pin = TaskIndex.objects.filter(
                task=OuterRef("pk"), user_id=user.id
            ).values("pin_at")[:1]
            task_index = TaskIndex.objects.filter(
                task=OuterRef("pk"), user_id=user.id
            ).values("index")[:1]
            # Annotate the queryset with the index from TaskIndex
            queryset = queryset.annotate(
                index=Subquery(task_index),
                coalesced_pin_at=Coalesce(
                    Subquery(task_pin),
                    Value(REPLACE_NULL_DATE),
                    output_field=DateTimeField(),
                ),
            ).order_by("-coalesced_pin_at", "-index")

            if "deadline" in ordering:
                Setting.objects.update_or_create(
                    user=user,
                    company_id=user.company_id,
                    defaults={
                        "is_sorting_task_by_deadline": True,
                        "is_sorting_task_by_important": False,
                    },
                )
            if "is_important" in ordering:
                Setting.objects.update_or_create(
                    user=user,
                    company_id=user.company_id,
                    defaults={
                        "is_sorting_task_by_deadline": False,
                        "is_sorting_task_by_important": True,
                    },
                )

        # Fill context to serializer
        context = {}
        if request.query_params.get("is_team_task"):
            context["organization_id"] = request.query_params.get(
                "organization_id"
            )
            context["user_id"] = user.id

        return self.response_pagination(
            request, queryset, TaskBoardSerializer, extra_context=context
        )


@extend_schema(tags=["System > Task"])
class TaskTeamdockViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint to show Tasks to the Teamdock.
    """

    queryset = User.objects.all()
    serializer_class = TaskTeamdockSerializer
    ordering_fields = [
        "deadline",
        "-deadline",
        "is_important",
        "-is_important",
    ]

    def get_serializer_context(self):
        """Append context to serializer"""
        context = super().get_serializer_context()
        context["ordering_fields"] = self.ordering_fields
        context["request"] = self.request
        return context

    def get_queryset(self):
        """Filter queryset"""
        user_logged = self.request.user
        queryset = (
            super().get_queryset().filter(company_id=user_logged.company_id)
        )

        # Filter by organization id
        if organization_id := self.request.query_params.get("organization_id"):
            queryset = queryset.filter(organizations__id=organization_id)

        # Filter by user ids
        if user_ids := self.request.query_params.get("user_ids"):
            if ids := split_id_from_string(user_ids):
                queryset = queryset.filter(id__in=ids)

        # Sort logged in users at the top
        queryset = queryset.annotate(
            is_logged_in=Case(
                When(id=user_logged.id, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by("is_logged_in", "created_at")

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=str, required=True),
            OpenApiParameter("user_ids", type=str, required=False),
            OpenApiParameter("page_size", type=int),
            OpenApiParameter("ordering", type=str, enum=ordering_fields),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("search", type=str),
            OpenApiParameter("is_cross_team_task", type=bool),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        parameters=[
            OpenApiParameter("page", type=int),
            OpenApiParameter("page_size", type=int),
            OpenApiParameter("organization_id", type=str, required=True),
            OpenApiParameter("user_ids", type=str, required=False),
            OpenApiParameter("ordering", type=str, enum=ordering_fields),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
            OpenApiParameter("search", type=str),
        ]
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="not-setting-user",
        serializer_class=TaskBoardSerializer,
    )
    def task_not_setting_user(self, request):
        """
        Get list task not setting user
        """
        user = request.user
        organization_id = request.query_params.get("organization_id")
        ordering = request.query_params.get("ordering")
        tasks = (
            Task.objects.filter(
                organization_id=organization_id,
                people_in_charge__isnull=True,
                company_id=user.company_id,
            )
            .exclude(type=TaskTypes.MY_TEMPLATE.value)
            .all()
        )

        # Validate ordering before applying it
        if ordering:
            if ordering in self.ordering_fields:
                tasks = tasks.annotate(
                    coalesced_deadline=Coalesce(
                        "deadline",
                        Value(
                            REPLACE_NULL_DATE_WITH_FUTURE,
                            output_field=DateTimeField(),
                        ),
                    )
                )

                if "deadline" in ordering:
                    tasks = tasks.order_by(
                        "coalesced_deadline", "-is_important", "-updated_at"
                    )

                if "is_important" in ordering:
                    tasks = tasks.order_by(
                        "-is_important", "coalesced_deadline", "-updated_at"
                    )

                # Update team task index only if sorting by deadline or importance
                for idx, task in enumerate(tasks):
                    team_task_index = task.team_task_index.filter(
                        team_id=organization_id, user=user
                    ).first()
                    if team_task_index:
                        if team_task_index.pin_at:
                            team_task_index.pin_at = timezone.now() - timedelta(
                                minutes=INITIAL_INDEX_VALUE + idx
                            )
                        team_task_index.index = INITIAL_INDEX_VALUE - idx
                        team_task_index.save()
            else:
                raise ValidationError(
                    {
                        "detail": ERROR_MESSAGES[
                            "invalid_ordering_field"
                        ].format(field_name=ordering)
                    }
                )

        # Handle filter data
        if tag_ids := request.query_params.get("tag_ids"):
            if ids := split_id_from_string(tag_ids):
                tasks = tasks.filter(tags__id__in=ids)

        if category_ids := request.query_params.get("category_ids"):
            if ids := split_id_from_string(category_ids):
                tasks = tasks.filter(
                    categories__large_statistic_category__in=ids
                )

        if organization_ids := request.query_params.get("organization_ids"):
            if ids := split_id_from_string(organization_ids):
                tasks = tasks.filter(organization_id__in=ids)

        if search := request.query_params.get("search"):
            tasks = tasks.filter(title__icontains=search)

        # If the current user has no team task index, reindex tasks
        if (
            not ordering
            and not TeamTaskIndex.objects.filter(
                team_id=organization_id,
                user=user,
                task__people_in_charge__isnull=True,
            ).exists()
        ):
            tasks = tasks.annotate(
                coalesced_deadline=Coalesce(
                    "deadline",
                    Value(
                        REPLACE_NULL_DATE_WITH_FUTURE,
                        output_field=DateTimeField(),
                    ),
                )
            ).order_by("coalesced_deadline", "-updated_at")

            # Update team task index only if sorting by deadline or importance
            for idx, task in enumerate(tasks):
                TeamTaskIndex.objects.create(
                    task=task,
                    team_id=organization_id,
                    user=user,
                    index=INITIAL_INDEX_VALUE - idx,
                )
        else:
            # Fetch task index and pinned status for the user
            team_task_index_obj = TeamTaskIndex.objects.filter(
                task=OuterRef("pk"), team_id=organization_id, user=user
            )
            task_pin = team_task_index_obj.values("pin_at")[:1]
            task_index = team_task_index_obj.values("index")[:1]

            # Annotate tasks with task index and pin timestamp
            tasks = tasks.annotate(
                index=Subquery(task_index),
                coalesced_pin_at=Coalesce(
                    Subquery(task_pin),
                    Value(REPLACE_NULL_DATE),
                    output_field=DateTimeField(),
                ),
            ).order_by("-coalesced_pin_at", "-index", "-created_at")

        return self.response_pagination(
            request,
            tasks,
            TaskBoardSerializer,
            extra_context={
                "organization_id": organization_id,
                "user_id": user.id,
            },
        )


@extend_schema(tags=["System > Task > Todo List"])
class TodoListViewSet(
    BaseAPIViewSet,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
):
    """
    API endpoint for todo list.
    """

    queryset = TodoList.objects.all()
    serializer_class = TodoListSerializer
    permission_classes = [ActionPermission]
    screen_name = Screens.MY_TASK.value

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().filter(company_id=user.company_id)
        return queryset
