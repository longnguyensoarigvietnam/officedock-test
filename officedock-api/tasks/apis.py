from datetime import datetime, time, timedelta
from time import timezone

from django.db import transaction
from django.db.models import (
    Case,
    IntegerField,
    OuterRef,
    Subquery,
    When,
    Q,
    Value,
    DateTimeField,
    Max,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
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
from base.constants import REPLACE_NULL_DATE
from base.messages import ERROR_MESSAGES
from base.permissions import ActionPermission
from chat.constants import (
    WebSocketEventType,
    ChatMessageTypes,
    ChatRoomTypes,
)
from chat.models import ChatRoom
from chat.serializers import (
    ChatMessageSerializer,
    ChatRoomsParticipantsWebSocketSerializer,
)
from common.filters import CustomOrderFilter
from common.utils import send_web_socket_event, create_categories_by_model
from tasks.constants import (
    DEFAULT_PAGE_SIZE,
    TaskPriorities,
    INITIAL_INDEX_VALUE,
    TaskTypes,
    TaskStatus,
)
from tasks.utils import (
    create_task_schedule,
    create_todo_list_for_task,
    delete_task_schedules,
    delete_todo_list_for_task,
    update_task_schedule,
    update_todo_list_for_task,
    calculate_new_time,
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
    TodoList,
    TaskStatus as TaskStatusModel,
)
from .serializers import (
    TaskBoardSerializer,
    TaskCalendarSerializer,
    TaskIndexForCreationSerializer,
    TaskScheduleForCreationSerializer,
    TaskSerializer,
    TaskTeamdockSerializer,
    TodoListSerializer,
    TaskIndexSerializer,
    TaskIndexPinAtSerializer,
    TaskCommonSerializer,
    TaskScheduleSerializer,
    TaskTemplateSerializer,
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
        return super().get_queryset().filter(company=self.request.user.company)

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Perform to create a new task.
        """
        user = self.request.user
        serializer_data = serializer.validated_data
        people_in_charge_ids = serializer_data.pop("people_in_charge_ids", None)
        tag_ids = serializer_data.pop("tag_ids", None)
        todo_list = serializer_data.pop("todo_list", None)
        task_schedules = serializer_data.pop("task_schedules", None)
        send_to_chat = serializer_data.pop("send_to_chat", None)
        chat_room_code = serializer_data.pop("chat_room_code", None)
        copy_task = serializer_data.pop("copy_task", None)
        company = user.company
        categories = serializer_data.pop("category_ids", None)
        task_type = serializer_data.get("type", None)
        remind_countdown = serializer_data.pop("remind_countdown", None)
        remind_type = serializer_data.pop("remind_type", None)

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
                user = item["people_in_charge"]
                task.people_in_charge.add(
                    user,
                    through_defaults={"company": company},
                )
                reset_sort_task(user)
                if copy_task:
                    current_task_index = copy_task.task_index.filter(
                        user=user
                    ).first()

                    if current_task_index and current_task_index.pin_at is None:
                        task_index_bellow_current_task = (
                            TaskIndex.objects.filter(
                                task__status=task.status,
                                user=user,
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
                            user=user,
                            task=task,
                            is_update=False,
                            index=new_index,
                        )
                    else:
                        TaskIndex.update_max_index_for_user(
                            user=user, task=task, is_update=False
                        )
                else:
                    # Create new index for task created with user
                    TaskIndex.objects.create(task=task, user=user)

        # Handle send to chat
        if send_to_chat:
            self._send_to_chat(
                user,
                task,
                chat_room_code,
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

    def _send_to_task_space(self, user, message):
        """
        Handle send to task space
        """
        task_room = ChatRoom.objects.filter(
            type=ChatRoomTypes.TASK.value,
            chat_rooms_participants__user=user,
            company=user.company,
        ).first()
        task_message = task_room.chat_messages.create(**message)
        chat_room_participant = task_room.chat_rooms_participants.filter(
            user__id=user.id
        ).first()
        chat_room_participant.unread_messages = (
            chat_room_participant.unread_messages + 1
        )
        chat_room_participant.save()
        self._send_websocket(
            WebSocketEventType.MESSAGE.value,
            chat_room_participant,
            user,
            task_message,
        )

    def _send_websocket(
        self,
        socketEventType,
        chat_room_participant,
        user,
        message,
        user_participant=None,  # logged user
    ):
        """
        Handle send websocket
        """
        # Handle case realtime when send chat message
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
        if user_participant:
            # Handle case realtime when send chat message to logged user
            send_web_socket_event(
                {
                    "client_id": None,
                    "action": socketEventType,
                    "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                        user_participant
                    ).data,
                    "chat_message": ChatMessageSerializer(message).data,
                },
                user,
            )

    def _send_chat_message(self, participant, user, message_data):
        """
        Handle send chat message to participant
        """
        chat_room_participant = participant.chat_rooms_participants.filter(
            chat_room__type=ChatRoomTypes.PRIVATE.value,
            chat_room__participants=user,
        ).first()
        socketEventType = WebSocketEventType.MESSAGE.value

        if not chat_room_participant:
            chat_room = ChatRoom.objects.create(
                company=user.company, type=ChatRoomTypes.PRIVATE.value
            )
            chat_room.participants.set(
                [user, participant],
                through_defaults={"company": user.company},
            )
            chat_room_participant = chat_room.chat_rooms_participants.filter(
                user__id=participant.id
            ).first()
            socketEventType = WebSocketEventType.CREATE_CHAT_ROOM.value
        else:
            chat_room = chat_room_participant.chat_room
        message = chat_room.chat_messages.create(**message_data)
        chat_room_participant.unread_messages = (
            chat_room_participant.unread_messages + 1
        )
        chat_room_participant.hidden_at = None
        chat_room_participant.save()
        # Update unread message of user logged
        user_participant = chat_room.chat_rooms_participants.filter(
            user__id=user.id
        ).first()
        user_participant.unread_messages = user_participant.unread_messages + 1
        user_participant.hidden_at = None
        user_participant.save()
        self._send_websocket(
            socketEventType,
            chat_room_participant,
            user,
            message,
            user_participant=user_participant,
        )

    def _send_to_chat(
        self, user, task, chat_room_code, people_in_charge_ids, task_action=None
    ):
        """
        Handle send to chat of user
        """
        message_data = {
            "sender": user,
            "company": user.company,
            "task": task,
            "type": ChatMessageTypes.CREATION_TASK.value,
        }
        another_participant_id = None
        # Create task from chat
        if chat_room_code:
            chat_room = ChatRoom.objects.filter(code=chat_room_code).first()
            message = chat_room.chat_messages.create(**message_data)
            if chat_room.type not in [
                ChatRoomTypes.TASK.value,
                ChatRoomTypes.SKILL.value,
            ]:
                user_participant = chat_room.chat_rooms_participants.filter(
                    user__id=user.id
                ).first()
                user_participant.unread_messages = (
                    user_participant.unread_messages + 1
                )
                user_participant.hidden_at = None
                user_participant.save()
                # Send chat message to logged user
                send_web_socket_event(
                    {
                        "client_id": None,
                        "action": ChatMessageTypes.CREATION_TASK.value,
                        "chat_room": ChatRoomsParticipantsWebSocketSerializer(
                            user_participant
                        ).data,
                        "chat_message": ChatMessageSerializer(message).data,
                    },
                    user,
                )

            for participant in chat_room.chat_rooms_participants.exclude(
                user=user
            ).all():
                participant.unread_messages = participant.unread_messages + 1
                participant.hidden_at = None
                participant.save()
                # Send chat message realtime to participant
                self._send_websocket(
                    ChatMessageTypes.CREATION_TASK.value,
                    participant,
                    user,
                    message,
                    user_participant=None,
                )
                if chat_room.type == ChatRoomTypes.PRIVATE.value:
                    another_participant_id = participant.user.id

        # Edit or create from kanban
        if task_action == ChatMessageTypes.EDIT_TASK.value:
            people_in_charges = [
                item["people_in_charge"] for item in people_in_charge_ids
            ]
            # Unique element in list people
            unique_people = list(set(people_in_charges))
            current_people = [
                people_in_charge.user
                for people_in_charge in task.people_in_charge_tasks.all()
            ]
            # Handle websocket to removed people
            if delete_peoples := list(set(current_people) - set(unique_people)):
                message_data["type"] = ChatMessageTypes.REMOVE_MEMBER_TASK.value
                for delete_user in delete_peoples:
                    if delete_user != user:
                        # Send message to deleted people
                        self._send_chat_message(
                            participant=delete_user,
                            user=user,
                            message_data=message_data,
                        )
                    self._send_to_task_space(delete_user, message_data)
            if add_peoples := list(set(unique_people) - set(current_people)):
                message_data["type"] = ChatMessageTypes.ADD_MEMBER_TASK.value
                # Send message to added people
                for add_people in add_peoples:
                    if add_people != user:
                        self._send_chat_message(
                            participant=add_people,
                            user=user,
                            message_data=message_data,
                        )
                    self._send_to_task_space(add_people, message_data)
        else:
            for data in people_in_charge_ids:
                people_in_charge = data["people_in_charge"]

                # Send message to chat when create from chat
                if (
                    people_in_charge != user
                    and people_in_charge.id != another_participant_id
                ):
                    self._send_chat_message(
                        participant=people_in_charge,
                        user=user,
                        message_data=message_data,
                    )
                if people_in_charge != user:
                    self._send_to_task_space(people_in_charge, message_data)

            # Send message to task card of user logged
            self._send_to_task_space(user, message_data)

    def retrieve(self, request, *args, **kwargs):
        """
        Handle updating the count of task usage by the user.
        """
        task = self.get_object()
        user = request.user

        # Retrieve or create TaskFrequent and set the default company
        task_frequent, created = TaskFrequent.objects.get_or_create(
            user=user, task=task, defaults={"company": task.company}
        )

        # Increment the count if it's not a newly created instance
        if not created:
            task_frequent.count += 1
            task_frequent.save()

        return super().retrieve(request, *args, **kwargs)

    @transaction.atomic()
    def perform_update(self, serializer):
        """
        Perform to update a task.
        """
        user = self.request.user
        current_task = self.get_object()
        serializer_data = serializer.validated_data
        people_in_charge_ids = serializer_data.pop("people_in_charge_ids", None)
        tag_ids = serializer_data.pop("tag_ids", None)
        task_status = serializer_data.get("status", None)
        task_schedules = serializer_data.pop("task_schedules", None)
        todo_list = serializer_data.pop("todo_list", None)
        categories = serializer_data.pop("category_ids", None)
        # Update the first item in schedules
        plan_start_date = serializer_data.get("plan_start_date")
        plan_end_date = serializer_data.get("plan_end_date")
        # Get data for send to chat
        send_to_chat = serializer_data.pop("send_to_chat", None)
        chat_room_code = serializer_data.pop("chat_room_code", None)
        serializer_data.get("type", None)
        remind_countdown = serializer_data.pop("remind_countdown", None)
        remind_type = serializer_data.pop("remind_type", None)

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
                current_task.status.name == TaskStatus.MY_ROUTINE.value
                and task_status
                and task_status.name == TaskStatus.MY_ROUTINE.value
            ):
                serializer_data["deadline"] = None
            else:
                is_current_status_is_my_routine = (
                    current_task.status.name == TaskStatus.MY_ROUTINE.value
                )
                if task_status:
                    is_update_status_is_my_routine = (
                        task_status.name == TaskStatus.MY_ROUTINE.value
                    )
                    if (
                        is_current_status_is_my_routine
                        and not is_update_status_is_my_routine
                    ) or (
                        not is_current_status_is_my_routine
                        and is_update_status_is_my_routine
                    ):
                        raise ValidationError(
                            {
                                "detail": ERROR_MESSAGES["cannot_updated"],
                            }
                        )

        if serializer_data.get("deadline") and remind_countdown and remind_type:
            serializer_data["remind_at"] = calculate_new_time(
                serializer_data["deadline"], remind_countdown, remind_type
            )
            serializer_data["reminds"] = {
                "type": remind_type,
                "countdown": remind_countdown,
            }

        if (current_task.deadline != serializer_data.get("deadline")) or (
            current_task.is_important != serializer_data.get("is_important")
        ):
            reset_sort_task(user)

        # Update task
        task = serializer.save()

        # TODO: Remove code for case save first schedule
        # Save data to first task schedule
        if plan_start_date and plan_end_date:
            schedule = TaskSchedule.objects.filter(task=current_task).first()
            if schedule:
                update_task_schedule(schedule, serializer_data)
            else:
                create_task_schedule(current_task, serializer_data)
        # Handle send to chat

        if send_to_chat:
            self._send_to_chat(
                user,
                current_task,
                chat_room_code,
                people_in_charge_ids,
                ChatMessageTypes.EDIT_TASK.value,
            )
        # Handle task schedules creation
        if task_schedules is not None:
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

        # Update to last index if change status
        if (
            current_task.status is not None
            and task_status is not None
            and current_task.status != task_status
        ):
            for user in current_task.people_in_charge.all():
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
                user__id__in=[
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
                    through_defaults={"company": self.request.user.company},
                )

                # Update last index if add new user
                TaskIndex.update_max_index_for_user(
                    user=user, task=task, is_update=False
                )

        elif people_in_charge_ids == []:
            task.people_in_charge.clear()
            TaskIndex.objects.filter(task=task).delete()

        # Update tags in task
        if tag_ids is not None:
            # Remove all old tags and add new tag in request.
            task.tags.clear()
            for item in tag_ids:
                task.tags.add(
                    item["tag"],
                    through_defaults={"company": self.request.user.company},
                )
        elif tag_ids == []:
            task.tags.clear()

        # Create or update categories
        if categories is not None:
            create_categories_by_model(task, categories)

    def destroy(self, request, *args, **kwargs):
        """
        Handle destroying the task with send message realtime.
        """
        instance = self.get_object()
        if instance.chat_messages.count() != 0:
            message = instance.chat_messages.first()
            send_web_socket_event(
                {
                    "action": WebSocketEventType.DELETE_TASK.value,
                    "chat_room": {"code": message.chat_room.code},
                    "chat_message": ChatMessageSerializer(message).data,
                },
                chat_room=message.chat_room,
            )
        reset_sort_task(request.user)

        return super().destroy(request, *args, **kwargs)

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
        page_size = request.query_params.get("page_size", DEFAULT_PAGE_SIZE)

        try:
            page_size = int(page_size)
        except (TypeError, ValueError):
            page_size = DEFAULT_PAGE_SIZE

        if page_size <= 0:
            page_size = DEFAULT_PAGE_SIZE

        frequent_tasks = (
            TaskFrequent.objects.filter(
                user=request.user,
                company=request.user.company,
                task__people_in_charge__id=request.user.id,
            )
            .order_by("-count")
            .prefetch_related("task", "task__status")[:page_size]
        )
        tasks = [task.task for task in frequent_tasks]

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
            .order_by("task__id")
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

        # Extract tasks from validated data
        tasks_data = validated_data.get("tasks", [])

        # Validate and save each task
        for item in tasks_data:
            task = item.get("task")
            user = item.get("user")
            tag = item.get("tag")
            task_status = item.pop("status", None)
            is_begin_unpin = item.pop("is_begin_unpin")
            if is_begin_unpin:
                max_task_index = TaskIndex.objects.filter(
                    user=user, task__status=task.status, pin_at__isnull=True
                ).aggregate(Max("index"))["index__max"]
                item["index"] = (
                    (max_task_index + INITIAL_INDEX_VALUE)
                    if max_task_index
                    else INITIAL_INDEX_VALUE
                )
            # Create or update TaskIndex based on the presence of user or tag
            if user:
                item.pop("tag", None)
                TaskIndex.objects.update_or_create(
                    task=task, user=user, defaults=item
                )
                reset_sort_task(user)
            elif tag:
                item.pop("user", None)
                TaskIndex.objects.update_or_create(
                    task=task, tag=tag, defaults=item
                )
            else:
                return self.response(status_code=status.HTTP_400_BAD_REQUEST)

            if task_status:
                is_current_status_is_my_routine = (
                    task.status.name == TaskStatus.MY_ROUTINE.value
                )
                is_update_status_is_my_routine = (
                    task_status.name == TaskStatus.MY_ROUTINE.value
                )
                if (
                    is_current_status_is_my_routine
                    and not is_update_status_is_my_routine
                ) or (
                    not is_current_status_is_my_routine
                    and is_update_status_is_my_routine
                ):
                    raise ValidationError(
                        {
                            "detail": ERROR_MESSAGES["cannot_updated"],
                        }
                    )
                task.status = task_status
                task.save()
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
        pin_at = serializer.validated_data.get("pin_at")
        task_index = TaskIndex.objects.filter(task=task, user=user).first()
        if not task_index:
            raise ValidationError({"detail": ERROR_MESSAGES["task_not_exists"]})
        if task_index.pin_at is None and pin_at:
            task_index.pin_at = pin_at
        else:
            task_index.pin_at = None
            max_task_index = TaskIndex.objects.filter(
                user=user, task__status=task.status, pin_at__isnull=True
            ).aggregate(Max("index"))["index__max"]
            task_index.index = (
                (max_task_index + INITIAL_INDEX_VALUE)
                if max_task_index
                else INITIAL_INDEX_VALUE
            )

        task_index.save()
        reset_sort_task(user)

        return self.response_ok(TaskIndexSerializer(task_index).data)


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

        return queryset.filter(company=user.company)


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


@extend_schema(tags=["System > Task"])
class TaskBoardViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint to show Tasks to the Board.
    """

    queryset = (
        Task.objects.annotate(
            priority_number=Case(
                When(priority=TaskPriorities.HIGH.value, then=4),
                When(priority=TaskPriorities.MEDIUM.value, then=3),
                When(priority=TaskPriorities.LOW.value, then=2),
                default=1,
                output_field=IntegerField(),
            )
        )
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
        "priority": "priority_number",
        "id": "id",
    }
    filterset_class = TaskBoardFilter
    search_fields = [
        "title",
        "status__name",
        "priority",
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
            "priority",
            "description",
            "tags__name",
            "people_in_charge__profile__full_name",
        ]

        if search := self.request.query_params.get("search"):
            # List of date formats to attempt parsing
            date_formats = ["%Y/%m/%d", "%Y-%m-%d"]

            # Try to parse the search term into a valid date format
            parsed_date = None
            for date_format in date_formats:
                try:
                    parsed_date = datetime.strptime(search, date_format)
                    break
                except ValueError:
                    continue

            if parsed_date:
                # Append date fields to search_fields dynamically
                self.search_fields += self.date_search_fields

                # Format search date if any
                query_params = self.request.query_params.copy()
                query_params["search"] = parsed_date.strftime("%Y-%m-%d")
                self.request._request.GET = query_params

        # Make sure to sort by ID DESC
        if ordering := self.request.query_params.get("ordering"):
            if "id" not in ordering:
                query_params = self.request.query_params.copy()
                query_params["ordering"] = f"{ordering},-id"
                self.request._request.GET = query_params

        return super().filter_queryset(queryset)

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset().filter(company=user.company)
        user_id = self.request.query_params.get("user_id")
        ordering = self.request.query_params.get("ordering")
        task_pin = TaskIndex.objects.filter(
            task=OuterRef("pk"), user_id=user_id if user_id else user.id
        ).values("pin_at")[:1]

        # Filter tasks by the current user if no user_id is provided
        if not user_id:
            queryset = queryset.filter(people_in_charge__id=user.id)

        # Apply custom ordering if 'ordering' parameter is not provided
        if not ordering:
            task_index = TaskIndex.objects.filter(
                task=OuterRef("pk"), user_id=user_id if user_id else user.id
            ).values("index")[:1]
            # Annotate the queryset with the index from TaskIndex
            queryset = queryset.annotate(
                index=Subquery(task_index),
                coalesced_pin_at=Coalesce(
                    Subquery(task_pin),
                    Value(REPLACE_NULL_DATE),
                    output_field=DateTimeField(),
                ),
                task_index_pin_at=Subquery(task_pin),
            ).order_by("-coalesced_pin_at", "-index")
            if pin_at := self.request.query_params.get("pin_at"):
                queryset = queryset.filter(Q(coalesced_pin_at__lt=pin_at))
            elif index := self.request.query_params.get("index"):
                queryset = queryset.filter(
                    index__lt=index, task_index_pin_at__isnull=True
                )
        else:
            # Handle filter when pagination
            if id := self.request.query_params.get("task_id"):
                if "priority" in ordering:
                    priority = self.request.query_params.get("priority")
                    match priority:
                        case TaskPriorities.HIGH.value:
                            priority_number = 4
                        case TaskPriorities.MEDIUM.value:
                            priority_number = 3
                        case TaskPriorities.LOW.value:
                            priority_number = 2
                        case __:
                            priority_number = 1

                    queryset = queryset.filter(
                        Q(priority_number=priority_number, id__lt=id)
                        | Q(priority_number__lt=priority_number)
                    )
                elif "deadline" in ordering:
                    if deadline := self.request.query_params.get("deadline"):
                        queryset = queryset.filter(
                            Q(deadline__gt=deadline) | Q(deadline__isnull=True)
                        )
                    else:
                        queryset = queryset.filter(
                            deadline__isnull=True,
                            id__lt=id,
                        )

        # Handle exclude ids when case add, drag drop item
        if ids := self.request.query_params.get("ids"):
            exclude_ids = []
            for id in ids.split(","):
                try:
                    exclude_ids.append(int(id))
                except ValueError:
                    continue
            if exclude_ids:
                queryset = queryset.exclude(id__in=exclude_ids)

        if tag_ids := self.request.query_params.get("tag_ids"):
            ids = []
            for id in tag_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                queryset = queryset.filter(tags_tasks__tag__id__in=ids)

        if category_ids := self.request.query_params.get("category_ids"):
            ids = []
            for id in category_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                queryset = queryset.filter(
                    Q(categories__large_statistic_category__in=ids)
                )

        if organization_ids := self.request.query_params.get(
            "organization_ids"
        ):
            ids = []
            for id in organization_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                queryset = queryset.filter(Q(organization__in=ids))

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("deadline", type=datetime),
            OpenApiParameter("pin_at", type=datetime),
            OpenApiParameter("priority", type=str),
            OpenApiParameter("task_id", type=int),
            OpenApiParameter("index", type=float),
            OpenApiParameter("ids", type=str),
            OpenApiParameter("tag_ids", type=str),
            OpenApiParameter("category_ids", type=str),
            OpenApiParameter("organization_ids", type=str),
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
                tasks = queryset.all()
                for idx, task in enumerate(tasks):
                    task_index = task.task_index.first()
                    if task_index.pin_at:
                        task.task_index.update(
                            pin_at=timezone.now()
                            - timedelta(seconds=INITIAL_INDEX_VALUE + idx)
                        )
                    task.task_index.update(index=INITIAL_INDEX_VALUE - idx)

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
                    company=user.company,
                    defaults={
                        "is_sorting_task_by_deadline": True,
                        "is_sorting_task_by_important": False,
                    },
                )
            if "is_important" in ordering:
                Setting.objects.update_or_create(
                    user=user,
                    company=user.company,
                    defaults={
                        "is_sorting_task_by_deadline": False,
                        "is_sorting_task_by_important": True,
                    },
                )

        return self.response_pagination(request, queryset, TaskBoardSerializer)


@extend_schema(tags=["System > Task"])
class TaskTeamdockViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint to show Tasks to the Teamdock.
    """

    queryset = User.objects.order_by("created_at")
    serializer_class = TaskTeamdockSerializer

    def get_queryset(self):
        """Filter queryset"""
        queryset = (
            super().get_queryset().filter(company=self.request.user.company)
        )

        # Filter by organization id
        if organization_id := self.request.query_params.get("organization_id"):
            queryset = queryset.filter(organizations__id=organization_id)

        # Filter by user ids
        if user_ids := self.request.query_params.get("user_ids"):
            ids = []
            for id in user_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                queryset = queryset.filter(id__in=ids)

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("organization_id", type=str, required=False),
            OpenApiParameter("user_ids", type=str, required=False),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


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
        queryset = super().get_queryset().filter(company=user.company)
        return queryset
