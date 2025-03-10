import io
from datetime import datetime, timedelta, time
import random
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.files.storage import default_storage, FileSystemStorage
from django.db.models import Sum, Func
from django.utils import timezone
from django.utils.crypto import get_random_string
from djangorestframework_camel_case.render import CamelCaseJSONRenderer
from djangorestframework_camel_case.parser import CamelCaseJSONParser
from rest_framework.exceptions import ValidationError
from google.auth.transport.requests import Request
from google.cloud import storage

from base.messages import ERROR_MESSAGES
from calendars.constants import ScheduleCategoryTypes
from chat.constants import USER_ACTION_GROUP, WebSocketEventType
from common.constants import STRIP_TAGS
from organizations.models import OrganizationsStatisticCategories
from roles.constants import SelectionResultOptions
from users.models import User, RoleDetail


def get_signed_url(file, expiration_seconds=None):
    """
    Checks if the default storage is a local file system to generate a signed URL for a given file.
    """

    # Get file in local disk
    if isinstance(default_storage, FileSystemStorage):
        return default_storage.url(file.name)

    # Get file in GCS
    return generate_signed_url(file.name, expiration_seconds)


def generate_signed_url(blob_name: str, expiration_seconds=None) -> str:
    """
    Generate a signed URL for the given blob in the specified Google Cloud Storage bucket.
    """
    # Retrieve the credentials from the Django settings
    credentials = settings.GOOGLE_CLOUD_CREDENTIALS

    # Refresh the credentials to ensure we have a valid access token
    # This is necessary if the token is currently None or expired
    if (
        credentials.token is None
        or not credentials.valid
        or credentials.expired
    ):
        credentials.refresh(Request())

    # Create a Google Cloud Storage client
    client = storage.Client()

    # Get the specified bucket using its name from settings
    bucket = client.get_bucket(settings.GS_BUCKET_NAME)

    # Create a blob (reference) for the file in the bucket using the blob name
    blob = bucket.blob(blob_name)

    # Generate a signed URL for the blob that is valid for a specified duration
    signed_url = blob.generate_signed_url(
        version="v4",  # Use version 4 of the signed URL
        service_account_email=credentials.service_account_email,  # Email of the service account
        access_token=credentials.token,  # Current access token for authorization
        expiration=timedelta(
            seconds=expiration_seconds
            if expiration_seconds
            else settings.GS_EXPIRATION
        ),  # Expiration time for the signed URL
        method="GET",  # HTTP method that the signed URL allows
    )

    # Return the signed URL, optionally disabling the toolbar in the viewer
    return f"{signed_url}#toolbar=0"


def generate_unique_code(model, field, length=10):
    """
    Generate unique code for model.
    """
    code = get_random_string(length)
    while model.objects.filter(**{field: code}).exists():
        code = get_random_string(length)
    return code


def convert_to_camel_case(data):
    """
    Convert the given data to camelCase format using CamelCaseJSONRenderer.
    """
    renderer = CamelCaseJSONRenderer()
    return renderer.render(data).decode("UTF-8")


def parse_camel_case_json(text_data):
    """
    Parse a JSON string in camelCase format into a Python dictionary.
    """
    parser = CamelCaseJSONParser()
    return parser.parse(io.BytesIO(text_data.encode("UTF-8")))


def to_camel_case(snake_str):
    components = snake_str.split("_")
    return components[0] + "".join(x.capitalize() for x in components[1:])


def send_web_socket_event(data, user=None, chat_room=None):
    """
    Send websocket event.
    """
    channel_layer = get_channel_layer()
    if user:
        # Get user_id if participant and id if user
        user_id = user.user_id if hasattr(user, "user_id") else user.id
        async_to_sync(channel_layer.group_send)(
            USER_ACTION_GROUP.format(user_id),
            {
                "type": "send_event",
                "data": data,
            },
        )
        if data["action"] not in [
            WebSocketEventType.CHANGE_TASK_STATUS.value,
            WebSocketEventType.CHANGE_ROLE.value,
            WebSocketEventType.REMIND_TASK.value,
            WebSocketEventType.DURATION_OVERTIME_WARNING.value,
        ]:
            # Send websocket total unread message
            async_to_sync(channel_layer.group_send)(
                USER_ACTION_GROUP.format(user_id),
                {
                    "type": "send_event",
                    "data": {
                        "action": WebSocketEventType.TOTAL_UNREAD_MESSAGE.value,
                        "total": get_total_unread_messages(user),
                    },
                },
            )
    if chat_room:
        async_to_sync(channel_layer.group_send)(
            chat_room.code,
            {
                "type": "send_event",
                "data": data,
            },
        )


def get_total_unread_messages(user):
    """
    Handle get total unread messages.
    """
    if not user:
        return 0
    if hasattr(user, "user_id"):
        user = User.objects.filter(id=user.user_id).first()
    total_unread_messages = user.chat_rooms_participants.filter(
        hidden_at=None
    ).aggregate(Sum("unread_messages"))["unread_messages__sum"]

    return total_unread_messages or 0


def format_duration(duration: timedelta) -> str:
    """Helper function to format timedelta as HH:MM:SS."""
    total_seconds = int(duration.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return "{:02}:{:02}:{:02}".format(hours, minutes, seconds)


def time_to_timedelta(time_str):
    # Function to convert "HH:MM:SS" to timedelta
    hours, minutes, seconds = map(int, time_str.split(":"))
    return timedelta(hours=hours, minutes=minutes, seconds=seconds)


def compare_categories(large, medium, small) -> bool:
    """
    Helper compare categories
    """
    # Check if all categories are the same or if medium and small categories are duplicates
    all_categories_same = large is not None and large == medium == small
    child_categories_same = medium is not None and medium == small
    parent_categories_same = large is not None and medium == large

    return (
        all_categories_same or child_categories_same or parent_categories_same
    )


def get_username_alias(login_text, is_operation_admin=False) -> str:
    """
    Get username alias using login
    """
    # Custom username alias allows duplicate username in Admin page and System page
    if login_text and is_operation_admin:
        username_alias = "admin." + login_text
    elif login_text:
        username_alias = "system." + login_text
    else:
        raise ValidationError({"detail": ERROR_MESSAGES["cannot_create"]})

    return username_alias


def check_permission_exists(request, permission_name):
    """Handle check permission exist"""
    if request.user == AnonymousUser():
        return False
    return (
        RoleDetail.objects.filter(
            role__users=request.user, permission__name=permission_name
        )
        .exclude(selection_result=SelectionResultOptions.NOT_ALLOWED.value)
        .exists()
    )


def transform_statistic_categories(statistic_categories):
    """Handle change statistic categories to hierarchy categories"""
    large_category_dict = {}
    result = []
    large_none_dict = {
        ScheduleCategoryTypes.LARGE.value: None,
        ScheduleCategoryTypes.MEDIUM.value: [],
    }
    for item in statistic_categories:
        large_obj = item.get("large_statistic_category")
        medium_obj = item.get("medium_statistic_category")
        small_obj = item.get("small_statistic_category")

        if large_obj:
            large_id = large_obj["id"]
            # Initialize large category entry if not present
            if large_id not in large_category_dict:
                large_obj["color"] = item.get("color")
                large_category_dict[large_id] = {
                    ScheduleCategoryTypes.LARGE.value: large_obj,
                    ScheduleCategoryTypes.MEDIUM.value: [],
                }

            # Handle medium category
            if medium_obj:
                medium_id = medium_obj["id"]
                medium_entry = next(
                    (
                        entry
                        for entry in large_category_dict[large_id][
                            ScheduleCategoryTypes.MEDIUM.value
                        ]
                        if entry[ScheduleCategoryTypes.MEDIUM.value]
                        and entry[ScheduleCategoryTypes.MEDIUM.value]["id"]
                        == medium_id
                    ),
                    None,
                )
                if not medium_entry:
                    medium_entry = {
                        ScheduleCategoryTypes.MEDIUM.value: medium_obj,
                        ScheduleCategoryTypes.SMALL.value: None,
                    }
                    large_category_dict[large_id][
                        ScheduleCategoryTypes.MEDIUM.value
                    ].append(medium_entry)

                # Add small category if it exists
                if small_obj:
                    if medium_entry[ScheduleCategoryTypes.SMALL.value] is None:
                        medium_entry[ScheduleCategoryTypes.SMALL.value] = []

                    medium_entry[ScheduleCategoryTypes.SMALL.value].append(
                        small_obj
                    )
            elif small_obj:
                small_entry = next(
                    (
                        entry
                        for entry in large_category_dict[large_id][
                            ScheduleCategoryTypes.MEDIUM.value
                        ]
                        if entry[ScheduleCategoryTypes.MEDIUM.value] is None
                    ),
                    None,
                )
                if not small_entry:
                    small_entry = {
                        ScheduleCategoryTypes.MEDIUM.value: None,
                        ScheduleCategoryTypes.SMALL.value: [],
                    }
                    large_category_dict[large_id][
                        ScheduleCategoryTypes.MEDIUM.value
                    ].append(small_entry)

                small_entry[ScheduleCategoryTypes.SMALL.value].append(small_obj)
        else:  # Merge all entries with large_statistic_category: None
            if medium_obj:
                medium_entry = next(
                    (
                        entry
                        for entry in large_none_dict[
                            ScheduleCategoryTypes.MEDIUM.value
                        ]
                        if entry[ScheduleCategoryTypes.MEDIUM.value]
                        and entry[ScheduleCategoryTypes.MEDIUM.value]["id"]
                        == medium_obj["id"]
                    ),
                    None,
                )
                if not medium_entry:
                    medium_entry = {
                        ScheduleCategoryTypes.MEDIUM.value: medium_obj,
                        ScheduleCategoryTypes.SMALL.value: [],
                    }
                    large_none_dict[ScheduleCategoryTypes.MEDIUM.value].append(
                        medium_entry
                    )

                # Add small category if it exists
                if small_obj:
                    medium_entry[ScheduleCategoryTypes.SMALL.value].append(
                        small_obj
                    )
            elif small_obj:
                small_entry = next(
                    (
                        entry
                        for entry in large_none_dict[
                            ScheduleCategoryTypes.MEDIUM.value
                        ]
                        if entry[ScheduleCategoryTypes.MEDIUM.value] is None
                    ),
                    None,
                )
                if not small_entry:
                    small_entry = {
                        ScheduleCategoryTypes.MEDIUM.value: None,
                        ScheduleCategoryTypes.SMALL.value: [],
                    }
                    large_none_dict[ScheduleCategoryTypes.MEDIUM.value].append(
                        small_entry
                    )

                small_entry[ScheduleCategoryTypes.SMALL.value].append(small_obj)

    # Combine the grouped large categories with standalone entries
    result.extend(large_category_dict.values())
    if large_none_dict[ScheduleCategoryTypes.MEDIUM.value]:
        result.append(large_none_dict)
    return result


def get_common_categories(category, obj=None):
    """Handle transform common category"""
    category_types = [
        ("large_statistic_category", ScheduleCategoryTypes.LARGE.value),
        ("medium_statistic_category", ScheduleCategoryTypes.MEDIUM.value),
        ("small_statistic_category", ScheduleCategoryTypes.SMALL.value),
    ]
    color = None
    if obj:
        color = (
            OrganizationsStatisticCategories.objects.filter(
                organization_id=obj.organization_id,
                large_statistic_category=category.large_statistic_category,
            )
            .values_list("color", flat=True)
            .first()
        )
    return [
        {
            "id": getattr(category, attr).id,
            "name": getattr(category, attr).name,
            "color": color
            if type_value == ScheduleCategoryTypes.LARGE.value
            else None,
            "type": type_value,
        }
        for attr, type_value in category_types
        if getattr(category, attr)
    ]


def create_categories_by_model(model, categories):
    """Handle create or update model categories"""
    if len(categories) > 3:
        raise ValidationError({"messages": ERROR_MESSAGES["cannot_create"]})
    model.categories.all().delete()
    large_cat = None
    medium_cat = None
    small_cat = None
    for data in categories:
        category = data["statistic_category"]
        if data["type"] == ScheduleCategoryTypes.LARGE.value:
            large_cat = category
        elif data["type"] == ScheduleCategoryTypes.MEDIUM.value:
            medium_cat = category
        elif data["type"] == ScheduleCategoryTypes.SMALL.value:
            small_cat = category

    model.categories.create(
        large_statistic_category=large_cat,
        medium_statistic_category=medium_cat,
        small_statistic_category=small_cat,
        company=model.company,
    )


def generate_random_color():
    """Generate a random hex color code."""
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))


class StripTags(Func):
    function = "regexp_replace"
    template = "%(function)s(%(expressions)s, {}, '', 'g')".format(STRIP_TAGS)


def generate_file_name(format: str = "png") -> str:
    """
    Generate file name.
    """
    current_time = datetime.now().strftime("%Y%m%d%H%M%S%f")
    random_number = random.randint(10000, 99999)
    return f"{current_time}{random_number}.{format}"


def check_task_overtime(task, task_duration, limit_time=None):
    """
    Handle return boolean if task run overtime or not.
    """
    datetime.combine(timezone.now().date(), time.min)
    is_over_estimate = False
    is_send_sk = False

    task_schedules = task.task_schedules.all().order_by("plan_start_date")
    for idx, task_schedule in enumerate(task_schedules):
        if idx + 1 < len(
            task_schedules
        ):  # Ensure next task exists before accessing
            next_task_schedule = task_schedules[idx + 1].plan_start_date
        else:
            next_task_schedule = None  # No next task

        prev_task_schedule = task_schedules[idx - 1] if idx > 0 else None
        if (
            prev_task_schedule
            and task_duration.is_cancel_alert
            and prev_task_schedule.plan_end_date
            < timezone.now()
            >= task_schedule.plan_start_date
        ):
            task_duration.is_cancel_alert = False
            is_send_sk = True
            task_duration.save()
        if limit_time:
            diff_time = (
                timedelta(minutes=30)
                <= (timezone.now() - task_schedule.plan_end_date)
                <= limit_time
            )
        else:
            diff_time = timedelta(minutes=30) <= (
                timezone.now() - task_schedule.plan_end_date
            )

        if (
            diff_time
            and task_duration.is_cancel_alert is False
            and (
                next_task_schedule is None
                or timezone.now() <= next_task_schedule
            )
        ):
            is_send_sk = True
            is_over_estimate = True
            break
        elif (
            timedelta(minutes=2)
            >= timezone.now() - task_schedule.plan_start_date
            >= timedelta(minutes=0)
        ):
            is_send_sk = True
            is_over_estimate = False
            break

    return is_send_sk, is_over_estimate
