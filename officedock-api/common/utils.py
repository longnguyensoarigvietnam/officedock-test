from calendar import monthrange
import io
from datetime import date, datetime, timedelta, time, timezone as tz
import random
import re
import hashlib
import hmac
import urllib

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.files.storage import default_storage, FileSystemStorage
from django.db.models import Sum, Func, Q
from django.utils import timezone
from django.utils.crypto import get_random_string
from djangorestframework_camel_case.render import CamelCaseJSONRenderer
from djangorestframework_camel_case.parser import CamelCaseJSONParser
from rest_framework.exceptions import ValidationError, NotFound

from base.messages import ERROR_MESSAGES, KEYWORDS
from calendars.constants import ScheduleCategoryTypes
from chat.constants import USER_ACTION_GROUP, WebSocketEventType
from common.constants import STRIP_TAGS
from organizations.constants import CategoryColors, OrganizationTypes
from organizations.models import OrganizationsStatisticCategories, Organization
from roles.constants import SelectionResultOptions
from skills.constants import DEFAULT_TIME
from stat_data.constants import NONE_CATEGORY
from users.models import User, RoleDetail


def get_signed_url(file, expiration_seconds=None):
    """
    Checks if the default storage is a local file system to generate a signed URL for a given file.
    """

    if not file:
        return None

    if isinstance(file, str):
        file_path = file
    else:
        file_path = file.name

    # Local
    if isinstance(default_storage, FileSystemStorage):
        return default_storage.url(file_path)

    # GCS or others
    return generate_signed_url(file_path, expiration_seconds)


def generate_signed_url(blob_name: str, expiration_seconds=None) -> str:
    """
    Generate a signed URL using an HMAC key.

    This function creates a time-limited signed URL for a GCS object using an
    HMAC key for authentication. The access ID and secret are read from
    environment variables.
    Args:
        blob_name (str): The name/path of the file in the storage bucket.
        expiration_seconds (int, optional): How long the URL should be valid for.
    Returns:
        str: A signed URL that can be used to access the file.
    Raises:
        ValueError: If HMAC credentials are not set in environment variables.
    """

    access_id = settings.GS_HMAC_ACCESS_ID
    secret = settings.GS_HMAC_SECRET

    if not access_id or not secret:
        raise ValueError("GS_HMAC_ACCESS_ID and/or GS_HMAC_SECRET are not set.")

    # V4 signing process.
    method = "GET"
    bucket_name = settings.GS_BUCKET_NAME

    cname = settings.GS_CUSTOM_ENDPOINT
    if cname:
        host = cname
        path = f"/{blob_name}"
    else:
        host = "storage.googleapis.com"
        path = f"/{bucket_name}/{blob_name}"

    now = datetime.now(tz.utc)
    datestamp = now.strftime("%Y%m%d")
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")

    signed_headers = "host"
    canonical_headers = f"host:{host}\n"

    canonical_querystring = urllib.parse.urlencode(
        {
            "X-Goog-Algorithm": "GOOG4-HMAC-SHA256",
            "X-Goog-Credential": f"{access_id}/{datestamp}/auto/storage/goog4_request",
            "X-Goog-Date": timestamp,
            "X-Goog-Expires": (
                expiration_seconds
                if expiration_seconds
                else settings.GS_EXPIRATION
            ),
            "X-Goog-SignedHeaders": signed_headers,
        }
    )

    canonical_request = "\n".join(
        [
            method,
            path,
            canonical_querystring,
            canonical_headers,
            signed_headers,
            "UNSIGNED-PAYLOAD",
        ]
    )

    credential_scope = f"{datestamp}/auto/storage/goog4_request"
    string_to_sign = "\n".join(
        [
            "GOOG4-HMAC-SHA256",
            timestamp,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )

    def _get_signature_key(key, date_stamp, region_name, service_name):
        k_date = hmac.new(
            ("GOOG4" + key).encode("utf-8"),
            date_stamp.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        k_region = hmac.new(
            k_date, region_name.encode("utf-8"), hashlib.sha256
        ).digest()
        k_service = hmac.new(
            k_region, service_name.encode("utf-8"), hashlib.sha256
        ).digest()
        k_signing = hmac.new(
            k_service, "goog4_request".encode("utf-8"), hashlib.sha256
        ).digest()
        return k_signing

    signing_key = _get_signature_key(secret, datestamp, "auto", "storage")
    signature = hmac.new(
        signing_key, string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    signed_url = f"https://{host}{path}?{canonical_querystring}&X-Goog-Signature={signature}"

    return signed_url


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


def to_snake_case(string):
    """Convert text to snake case"""
    string = string.replace("-", " ")
    string = re.sub("([A-Z]+)", r" \1", string)
    string = re.sub("([a-z])([A-Z])", r"\1 \2", string)
    return "_".join(string.split()).lower()


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
        if data["action"] in [
            WebSocketEventType.MESSAGE.value,
            WebSocketEventType.ADD_PARTICIPANT.value,
            WebSocketEventType.EDIT_MESSAGE.value,
            WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
            WebSocketEventType.CREATE_CHAT_ROOM.value,
            WebSocketEventType.UPDATE_CHAT_ROOM.value,
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
        if data["action"] == WebSocketEventType.CREATE_CHAT_ROOM.value:
            # Send websocket total unread message
            async_to_sync(channel_layer.group_send)(
                USER_ACTION_GROUP.format(user_id),
                {
                    "type": "join_new_room",
                    "room_code": data["chat_room"]["code"],
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
    total_unread_messages = user.chat_rooms_participants.aggregate(
        Sum("unread_messages")
    )["unread_messages__sum"]

    return total_unread_messages or 0


def format_duration(duration: timedelta) -> str:
    """Helper function to format timedelta as HH:MM:SS."""
    if duration is None:
        return DEFAULT_TIME
    total_seconds = int(duration.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return "{:02}:{:02}:{:02}".format(hours, minutes, seconds)


def time_str_to_timedelta(time_str):
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


def transform_statistic_categories_for_skill_map(statistic_categories):
    """
    Transform flat list of statistic categories into a nested hierarchy:
    large → medium → small, with default placeholders for null values.
    Handles duplicates by ID properly and ensures '未設定' categories are shown first.
    """
    LARGE = ScheduleCategoryTypes.LARGE.value
    MEDIUM = ScheduleCategoryTypes.MEDIUM.value
    SMALL = ScheduleCategoryTypes.SMALL.value

    def normalize_category(category):
        return (
            dict(category)
            if category
            else {"id": NONE_CATEGORY, "name": NONE_CATEGORY}
        )

    def get_color(category, default_color="#D7576A"):
        return "#83919E" if category["id"] == NONE_CATEGORY else default_color

    large_dict = {}

    for item in statistic_categories:
        large = normalize_category(item.get("large_statistic_category"))
        medium = normalize_category(item.get("medium_statistic_category"))
        small = normalize_category(item.get("small_statistic_category"))

        large_id = str(large["id"])
        medium_id = str(medium["id"])
        small_id = str(small["id"])

        large_color = get_color(large, item.get("color", "#D7576A"))
        large_key = large_id

        # Add large when haven't
        if large_key not in large_dict:
            large_dict[large_key] = {
                LARGE: {**large, "color": large_color},
                MEDIUM: {},
            }

        # Add medium when haven't
        medium_dict = large_dict[large_key][MEDIUM]
        if medium_id not in medium_dict:
            medium_dict[medium_id] = {MEDIUM: medium, SMALL: []}

        # Add small when haven't
        small_list = medium_dict[medium_id][SMALL]
        if all(str(s.get("id")) != small_id for s in small_list):
            small_entry = {**small}
            if small_entry["id"] == NONE_CATEGORY:
                small_entry["uuid"] = NONE_CATEGORY
                small_entry["color"] = "#83919E"
            small_list.append(small_entry)

    # Change dict to list and push None category to first
    def sort_by_none_first(items_dict):
        return [
            v
            for k, v in sorted(
                items_dict.items(),
                key=lambda x: 0 if x[0] == NONE_CATEGORY else 1,
            )
        ]

    result = []
    for large_id, large_data in sorted(
        large_dict.items(), key=lambda x: 0 if x[0] == NONE_CATEGORY else 1
    ):
        medium_list = []
        for medium_data in sort_by_none_first(large_data[MEDIUM]):
            # sort small inside medium
            medium_data[SMALL].sort(
                key=lambda s: 0 if str(s["id"]) == NONE_CATEGORY else 1
            )
            medium_list.append(medium_data)
        result.append({LARGE: large_data[LARGE], MEDIUM: medium_list})

    return result


def transform_statistic_categories(statistic_categories):
    """
    Transform flat list of statistic categories into a nested hierarchy:
    large → medium → small, with default placeholders for null values.
    Handles duplicates by ID properly and ensures '未設定' categories are shown first.
    """
    LARGE = ScheduleCategoryTypes.LARGE.value
    MEDIUM = ScheduleCategoryTypes.MEDIUM.value
    SMALL = ScheduleCategoryTypes.SMALL.value
    DEFAULT_CATEGORY = {
        "id": None,
        "name": NONE_CATEGORY,
        "uuid": NONE_CATEGORY,
        "color": CategoryColors.GRAY.value,
    }

    def normalize_category(category):
        return dict(category) if category else None

    def get_color(category, default_color=CategoryColors.GRAY.value):
        return (
            CategoryColors.GRAY.value
            if category.get("id") in [None, NONE_CATEGORY]
            else default_color
        )

    def is_deleted(cat):
        return cat and cat.get("deleted_at") not in [None, ""]

    large_dict = {}

    for item in statistic_categories:
        large = normalize_category(item.get("large_statistic_category"))
        medium = normalize_category(item.get("medium_statistic_category"))
        small = normalize_category(item.get("small_statistic_category"))

        large_key = str(large.get("id")) if large else "None"
        large_data = large if large else DEFAULT_CATEGORY

        large_color = get_color(
            large_data, item.get("color", CategoryColors.GRAY.value)
        )

        if large_key not in large_dict:
            large_dict[large_key] = {
                LARGE: {**large_data, "color": large_color},
                MEDIUM: {},
            }

        medium_dict = large_dict[large_key][MEDIUM]

        medium_key = str(medium.get("id")) if medium else "None"
        if medium_key not in medium_dict:
            medium_data = medium if medium else None
            medium_dict[medium_key] = {
                MEDIUM: medium_data,
                SMALL: [],
            }

        small_list = medium_dict[medium_key][SMALL]
        if small and all(
            str(s.get("id")) != str(small.get("id")) for s in small_list
        ):
            small_entry = {**small}
            if small_entry.get("id") in [None, NONE_CATEGORY]:
                small_entry["uuid"] = NONE_CATEGORY
                small_entry["color"] = CategoryColors.GRAY.value
            small_list.append(small_entry)

    # Ensure '未設定' large/medium/small exists
    none_large_key = "None"
    if none_large_key not in large_dict:
        large_dict[none_large_key] = {
            LARGE: DEFAULT_CATEGORY,
            MEDIUM: {
                "None": {
                    MEDIUM: None,
                    SMALL: [],
                }
            },
        }

    # Sort helper
    def sort_key(item):
        if item is None:
            return (0, 0, "")
        deleted_flag = 1 if is_deleted(item) else 0
        name = str(item.get("name") or "")
        none_flag = 0 if name == NONE_CATEGORY else 1
        return (deleted_flag, none_flag, name)

    result = []
    for large_id, large_data in sorted(
        large_dict.items(),
        key=lambda x: (0 if x[0] == "None" else 1, *sort_key(x[1][LARGE])),
    ):
        medium_list = []
        medium_items = list(large_data[MEDIUM].values())

        for medium_data in sorted(
            medium_items, key=lambda m: sort_key(m[MEDIUM])
        ):
            medium_data[SMALL].sort(key=sort_key)
            medium_list.append(medium_data)

        result.append({LARGE: large_data[LARGE], MEDIUM: medium_list})

    return result


def get_large_statistic_category_color(task):
    """Handle get large statistic category color"""

    item = (
        OrganizationsStatisticCategories.objects.filter(
            organization_id=task.organization_id,
            large_statistic_category__large_categories__task=task,
        )
        .select_related("large_statistic_category")
        .only("color", "large_statistic_category", "deleted_type")
        .first()
    )

    color, cate_obj, deleted_type = None, None, None
    if item:
        color = item.color
        cate_obj = item.large_statistic_category
        deleted_type = item.deleted_type

    return [
        {
            "id": None,
            "name": get_deleted_statistic_category_name(
                cate_obj, deleted_type, ScheduleCategoryTypes.LARGE.value
            ),
            "color": color,
            "type": ScheduleCategoryTypes.LARGE.value,
        }
    ]


def get_common_categories(category, obj=None):
    """Handle transform common category"""

    if not category:
        return []

    category_types = [
        ("large_statistic_category", ScheduleCategoryTypes.LARGE.value),
        ("medium_statistic_category", ScheduleCategoryTypes.MEDIUM.value),
        ("small_statistic_category", ScheduleCategoryTypes.SMALL.value),
    ]

    color = None
    deleted_type = None

    if obj:
        filters = Q(organization_id=obj.organization_id)
        if category.large_statistic_category:
            filters &= Q(
                large_statistic_category=category.large_statistic_category
            )
        if category.medium_statistic_category:
            filters &= Q(
                medium_statistic_category=category.medium_statistic_category
            )
        if category.small_statistic_category:
            filters &= Q(
                small_statistic_category=category.small_statistic_category
            )

        org_cate = OrganizationsStatisticCategories.objects.filter(
            filters
        ).first()
        if org_cate:
            color = org_cate.color
            deleted_type = org_cate.deleted_type

    results = []

    for attr, type_value in category_types:
        if not hasattr(category, attr):
            continue

        cate_obj = getattr(category, attr)
        if cate_obj is None:
            continue

        is_large_cate = type_value == ScheduleCategoryTypes.LARGE.value
        is_hidden = get_is_statistic_category_hidden(deleted_type, type_value)
        results.append(
            {
                "id": cate_obj.id,
                "name": get_deleted_statistic_category_name(
                    cate_obj, is_hidden=is_hidden
                ),
                "color": color if is_large_cate else None,
                "type": type_value,
                "is_hidden": is_hidden,
            }
        )

    return results


def get_common_categories_with_none_category(
    category, obj=None, deleted_type=None
):
    """Handle transform common category"""

    if not category:
        return []

    category_types = [
        ("large_statistic_category", ScheduleCategoryTypes.LARGE.value),
        ("medium_statistic_category", ScheduleCategoryTypes.MEDIUM.value),
        ("small_statistic_category", ScheduleCategoryTypes.SMALL.value),
    ]

    color = None
    organization_type = None

    if obj:
        organization_type = obj.organization.type

        filters = Q(organization_id=obj.organization_id)
        if category.large_statistic_category:
            filters &= Q(
                large_statistic_category=category.large_statistic_category
            )
        if category.medium_statistic_category:
            filters &= Q(
                medium_statistic_category=category.medium_statistic_category
            )
        if category.small_statistic_category:
            filters &= Q(
                small_statistic_category=category.small_statistic_category
            )

        org_cate = OrganizationsStatisticCategories.objects.filter(
            filters
        ).first()
        if org_cate:
            color = org_cate.color
            deleted_type = org_cate.deleted_type

    formatted = []
    for attr, type_value in category_types:
        if (
            obj
            and organization_type == OrganizationTypes.CALENDAR.value
            and type_value == ScheduleCategoryTypes.SMALL.value
        ):
            continue

        is_large_cate = type_value == ScheduleCategoryTypes.LARGE.value
        is_hidden = get_is_statistic_category_hidden(deleted_type, type_value)
        if cate_obj := getattr(category, attr):
            formatted.append(
                {
                    "id": cate_obj.id,
                    "name": get_deleted_statistic_category_name(
                        cate_obj, is_hidden=is_hidden
                    ),
                    "color": color if is_large_cate else None,
                    "type": type_value,
                    "is_hidden": is_hidden,
                }
            )
        else:
            formatted.append(
                {
                    "id": NONE_CATEGORY,
                    "name": NONE_CATEGORY,
                    "color": color if is_large_cate else None,
                    "type": type_value,
                    "is_hidden": is_hidden,
                }
            )
    return formatted


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


def generate_file_name(file_name="png") -> str:
    """
    Generate file name.
    """
    name = file_name.split(".")[-1] if file_name and "." in file_name else "png"
    ext = f".{name}" if file_name else ""
    current_time = datetime.now().strftime("%Y%m%d%H%M%S%f")
    random_number = random.randint(10000, 99999)
    return f"{current_time}{random_number}{ext}"


def check_task_overtime(model, task_duration, limit_time=None):
    """
    Handle return boolean if task run overtime or not.
    """
    # Avoid circular import
    from tasks.models import Task

    datetime.combine(timezone.now().date(), time.min)
    is_over_estimate = False
    is_send_sk = False
    if isinstance(model, Task):
        task_schedules = model.task_schedules.all().order_by("plan_start_date")
    else:
        task_schedules = model.repeat_schedules.all().order_by(
            "plan_start_date"
        )

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
            and task_duration.paused_at is not None
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


def split_id_from_string(string_ids):
    """
    Convert a comma-separated string of IDs into a list of integers.
    """
    if string_ids is None:
        return []
    ids = []
    for id in string_ids.split(","):
        try:
            ids.append(int(id))
        except ValueError:
            continue
    return ids


def filter_task_index_team(task):
    """Common filter team task index"""
    if not task.people_in_charge.exists():
        task_filter = Q(task__people_in_charge__isnull=True)
    else:
        people_in_charge_ids = task.people_in_charge.all().values_list(
            "id", flat=True
        )
        task_filter = Q(task__status=task.status) & Q(
            task__people_in_charge__in=people_in_charge_ids
        )
    return task_filter


def compare_list_categories(input_categories, current_categories):
    """
    Compare categories from query params and current categories
    """
    if len(input_categories) != len(current_categories):
        return False
    for a, b in zip(input_categories, current_categories):
        stat_cat = a.get("statistic_category")
        a_id = stat_cat.id if stat_cat is not None else None
        a_type = a.get("type")

        if a_id != b.get("id") or a_type != b.get("type"):
            return False  # Mismatch or None detected
    return True  # All matched


def delete_file(file_path: str) -> None:
    """Delete a file from storage.

    Args:
        file_path (str): Path to the file to delete

    Note:
        Silently handles non-existent files and empty paths
    """
    if file_path and default_storage.exists(file_path):
        default_storage.delete(file_path)


def validate_company_organization(company, org_id, required_field=False):
    """
    Validate that the given organization ID belongs to the specified company.

    Args:
        company: The company instance to check organizations against. Expected to have a related 'organizations' manager.
        org_id: The ID of the organization to validate.
        required_field: Check field input is required

    Returns:
        The organization instance if found, otherwise raises NotFound.

    Raises:
        NotFound: If the organization with the given ID does not belong to the company.
    """
    if required_field and not org_id:
        raise ValidationError(
            {"organization_id": ERROR_MESSAGES["field_required"]}
        )

    org = None
    if org_id:
        org = Organization.all_objects.filter(
            company=company, id=org_id
        ).first()
        if not org:
            raise NotFound(ERROR_MESSAGES["organization_not_exists"])

    return org


def parse_search_date(search):
    """
    Try to parse the search term into a valid date format and return the datetime object if successful, else None.

    Args:
        search (str): The input string to be parsed as a date. Accepts formats like 'YYYY/MM/DD' or 'YYYY-MM-DD'.

    Returns:
        datetime or None: The parsed datetime object if the input matches a supported format, otherwise None.
    """
    if not search:
        return None

    # List of supported date formats
    date_formats = ["%Y/%m/%d", "%Y-%m-%d"]
    for date_format in date_formats:
        try:
            return datetime.strptime(search, date_format)
        except ValueError:
            continue

    return None


def get_user_organizations_with_descendants(user: User) -> list[int]:
    """
    Retrieve all organizations that the given user belongs to, including all descendant organizations recursively.

    Args:
        user: The user instance for whom to retrieve organizations.

    Returns:
        List of organization IDs (integers) that the user is a member of, including all descendant organizations.
    """
    org_ids = list()

    def _get_children(instance):
        children = instance.organizations.all()
        for child in children:
            org_ids.append(child.id)
            _get_children(child)

    _get_children(user)

    return org_ids


def calculate_company_dates(company, reference_date_param=None):
    """
    Calculate important accounting-related dates for a company.

    Logic:
    - Determines the company's monthly closing date.
    - Calculates the date right after closing.
    - Determines the deadline for post-closing data edits.
    - Calculates the start date for next-month calculations.
    - Handles edge cases like months with fewer days (e.g., February).

    Args:
        company: Company instance with `close_date` and `editable_after_closing` attributes.
        reference_date_param (date, optional): The base date for calculation (defaults to today).

    Returns:
        dict: {
            'close_date': date,                       # Closing date of the current month
            'date_after_closing': date,               # Day after closing date
            'date_after_data_edit_deadline': date,    # Last day allowed for editing data
            'start_date_calculation_deadline': date,  # Start of next calculation period
        }
    """

    # Step 1: Define the reference date
    if reference_date_param is None:
        reference_date_param = timezone.now().date()

    # Step 2: Get company-specific or default settings
    company_close_day = int(
        getattr(company, "close_date", settings.CLOSING_DATE)
    )
    company_editable_after_closing = int(
        getattr(
            company, "editable_after_closing", settings.EDITABLE_AFTER_CLOSING
        )
    )

    # Calculate correct reference date
    reference_date = reference_date_param
    reference_date_prev = reference_date - relativedelta(months=1)
    last_day_of_prev_month = monthrange(
        reference_date_prev.year, reference_date_prev.month
    )[1]
    if (
        company_close_day + company_editable_after_closing
        >= last_day_of_prev_month
    ):
        reference_date = reference_date_param - timedelta(
            days=company_editable_after_closing + 1
        )

    # Step 3: Calculate current month's closing date
    # Prevent invalid dates (e.g., Feb 30)
    last_day_of_month = monthrange(reference_date.year, reference_date.month)[1]
    close_day = min(company_close_day, last_day_of_month)
    close_date = date(reference_date.year, reference_date.month, close_day)

    # Step 4: Calculate previous month's closing date
    reference_date_prev = reference_date - relativedelta(months=1)
    last_day_of_prev_month = monthrange(
        reference_date_prev.year, reference_date_prev.month
    )[1]
    close_day_prev = min(company_close_day, last_day_of_prev_month)
    close_date_prev_month = date(
        reference_date_prev.year, reference_date_prev.month, close_day_prev
    )

    # Step 4: Calculate next month's closing date
    reference_date_next = reference_date + relativedelta(months=1)
    last_day_of_next_month = monthrange(
        reference_date_next.year, reference_date_next.month
    )[1]
    close_day_next = min(company_close_day, last_day_of_next_month)
    close_date_next_month = date(
        reference_date_next.year, reference_date_next.month, close_day_next
    )

    # Step 5: Calculate derived dates
    date_after_closing = close_date + timedelta(days=1)
    date_after_closing_next_month = close_date_next_month + timedelta(days=1)

    # Deadline for editing data (after closing date)
    date_after_data_edit_deadline = close_date + timedelta(
        days=company_editable_after_closing + 1
    )
    date_after_data_edit_deadline_prev_month = (
        close_date_prev_month
        + timedelta(days=company_editable_after_closing + 1)
    )

    # The first day after last month’s closing date → marks start of new calculation period
    start_date_calculation_deadline = close_date_prev_month + timedelta(days=1)

    # Step 6: Handle edge case where current reference date falls into previous month’s edit window
    if reference_date <= date_after_data_edit_deadline_prev_month:
        date_after_data_edit_deadline = date_after_data_edit_deadline_prev_month

    # Step 7: Return all calculated dates
    return {
        "close_date": close_date,
        "date_after_closing": date_after_closing,
        "date_after_closing_next_month": date_after_closing_next_month,
        "date_after_data_edit_deadline": date_after_data_edit_deadline,
        "start_date_calculation_deadline": start_date_calculation_deadline,
        "date_after_closing_this_month": date_after_closing
        if reference_date_param >= date_after_closing
        else start_date_calculation_deadline,
    }


def get_client_ip(request):
    """Return the best-effort client IP from request headers.

    Resolution order:
    1) First non-empty IP from `HTTP_X_FORWARDED_FOR` (original client behind proxies)
    2) `HTTP_X_REAL_IP`
    3) `REMOTE_ADDR`

    Returns None if no suitable IP is present.
    """
    meta = getattr(request, "META", {}) or {}
    x_forwarded_for = meta.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return next(
            (ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()),
            None,
        )
    return meta.get("HTTP_X_REAL_IP") or meta.get("REMOTE_ADDR")


def get_user_agent(request):
    """Return the raw User-Agent header string or empty string if missing."""
    return getattr(request, "META", {}).get("HTTP_USER_AGENT", "")


def format_date(date, style="jp_full"):
    """Return format date by multiple style"""
    formats = {
        "jp_date": "%Y年%m月%d日",
        "jp_month_year": "%Y年%m月",
        "jp_full": "%Y年%m月%d日 %H時%M分%S秒",
        "vn_date": "%d/%m/%Y",
        "iso": "%Y-%m-%d",
    }

    fmt = formats.get(style, formats["iso"])
    return date.strftime(fmt)


def to_datetime(ts):
    """Convert UNIX timestamp -> datetime"""
    if ts is None:
        return None
    if ts > 1e12:
        ts = ts / 1000
    return datetime.fromtimestamp(ts)


def get_a_day_in_next_month(date: datetime, target_date: int):
    """Return the target day of the next month"""
    next_month = date.month + 1 if date.month < 12 else 1
    next_year = date.year if date.month < 12 else date.year + 1
    return datetime(next_year, next_month, target_date, 0, 0, 0)


def common_filter_is_deleted(queryset, value):
    """
    Filter users by deletion status.

    Returns:
        A filtered queryset reflecting the requested deletion status
    """
    if value is True:
        queryset = queryset.filter(deleted_at__isnull=False)
    elif value is False:
        queryset = queryset.filter(deleted_at__isnull=True)

    return queryset.distinct()


def filter_include_deleted_user(request):
    """
    Returns a Q filter for users based on the 'has_include_deleted_user' query parameter in the request.
    If 'has_include_deleted_user' is set to 'false' (case-insensitive), the filter will restrict results to users who have not been soft deleted (i.e., where deleted_at is null).

    Args:
        request: The HTTP request object, expected to have 'query_params' containing 'has_include_deleted_user'.

    Returns:
        Q: A Django Q filter object for use in QuerySets.
    """
    has_include_deleted_user = request.query_params.get(
        "has_include_deleted_user"
    )
    filters = Q()
    if has_include_deleted_user and has_include_deleted_user.lower() == "false":
        filters = Q(deleted_at__isnull=True)
    return filters


def filter_include_deleted_skill(request):
    """
    Returns a Q filter for skills based on the 'has_include_deleted_skill' query parameter in the request.
    If 'has_include_deleted_skill' is set to 'false' (case-insensitive), the filter will restrict results to skills who have not been soft deleted (i.e., where deleted_at is null).

    Args:
        request: The HTTP request object, expected to have 'query_params' containing 'has_include_deleted_skill'.

    Returns:
        Q: A Django Q filter object for use in QuerySets.
    """
    has_include_deleted_skill = request.query_params.get(
        "has_include_deleted_skill"
    )
    filters = Q()
    if (
        has_include_deleted_skill
        and has_include_deleted_skill.lower() == "false"
    ):
        filters = Q(deleted_at__isnull=True)
    return filters


def get_deleted_name(obj, key="name"):
    """
    Return the object's field value with a 'deleted' suffix if the object is soft-deleted.

    Args:
        obj: The model instance containing the field.
        key (str): The field name to retrieve from the object. Defaults to "name".

    Returns:
        str: The field value. If the object is soft-deleted (deleted_at is not None),
             the returned value will include the 'deleted' suffix defined in KEYWORDS.
    """
    if not obj:
        return None

    value = getattr(obj, key, "")
    return value if obj.deleted_at is None else f"{value}{KEYWORDS['deleted']}"


def get_is_statistic_category_hidden(deleted_type=None, type_value=None):
    """
    Return deleted name of skill
    """

    LEVEL_ORDER = {
        ScheduleCategoryTypes.LARGE.value: 3,
        ScheduleCategoryTypes.MEDIUM.value: 2,
        ScheduleCategoryTypes.SMALL.value: 1,
    }

    is_hidden = False

    if deleted_type and type_value:
        is_hidden = LEVEL_ORDER[type_value] <= LEVEL_ORDER[deleted_type]

    return is_hidden


def get_deleted_statistic_category_name(
    obj, deleted_type=None, type_value=None, is_hidden=None
):
    """
    Return deleted name of skill
    """
    if not obj:
        return None

    LEVEL_ORDER = {
        ScheduleCategoryTypes.LARGE.value: 3,
        ScheduleCategoryTypes.MEDIUM.value: 2,
        ScheduleCategoryTypes.SMALL.value: 1,
    }

    value = getattr(obj, "name", "")

    if deleted_type and type_value:
        is_hidden = LEVEL_ORDER[type_value] <= LEVEL_ORDER[deleted_type]

    if is_hidden:
        return f"{value}{KEYWORDS['deleted']}"

    return value


def get_organization_name(obj, unassigned=False):
    """
    Return deleted/unassigned name of organization
    """
    if not obj:
        return None

    name = getattr(obj, "name", "")

    if obj.deleted_at:
        name += KEYWORDS["deleted"]
        return name

    if bool(unassigned):
        name += KEYWORDS["unassigned"]

    return name


def get_user_name(obj, unassigned=False):
    """
    Return deleted/unassigned name of  user
    """
    if not obj:
        return None

    name = getattr(obj, "full_name", "")

    if obj.deleted_at:
        return name

    if bool(unassigned):
        name += KEYWORDS["unassigned"]

    return name
