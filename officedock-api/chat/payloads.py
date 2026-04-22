from collections import defaultdict
from uuid import UUID

from django.db.models import F, Case, CharField, Value, When
from django.db.models.functions import Concat

from base.messages import KEYWORDS
from chat.constants import ChatRoomTypes
from chat.models import ChatRoom, ChatMessage, Bookmark, Reaction
from chat.serializers import ChatFileSerializer, UserPayloadMsgSerializer
from common.constants import AVATAR_GCS_EXPIRATION_SECONDS
from common.utils import get_signed_url
from organizations.models import UsersOrganizations
from organizations.serializers import BaseOrganizationSerializer
from submit_levels.models import SubmitLevelHistory
from tasks.models import Task
from users.models import User


def build_chat_participant_payload(
    chat_room: ChatRoom,
    user,
    participant_data=[],
    participant=None,
    last_message_at=None,
) -> dict:
    """
    Convert ChatRoomsParticipants to flat JSON dict, avoiding N+1 queries.
    """
    # Determine chat name
    if chat_room.type == ChatRoomTypes.SELF.value:
        room_name = user["full_name"]
    elif chat_room.type == ChatRoomTypes.PRIVATE.value:
        room_name = user["full_name"] if participant else None
    else:
        room_name = chat_room.name

    return {
        "code": chat_room.code,
        "name": room_name,
        "type": chat_room.type,
        "avatar": get_signed_url(
            chat_room.avatar, AVATAR_GCS_EXPIRATION_SECONDS
        ),
        "avatar_color": chat_room.avatar_color,
        "unread_messages": participant.unread_messages,
        "pin_at": participant.pin_at,
        "last_message_at": last_message_at.isoformat()
        if last_message_at
        else None,
        "participants": participant_data,
        "is_muted": participant.is_muted,
    }


def build_chat_message_payload(full_messages, request_user=None):
    """
    Convert ChatMessage queryset to flat JSON dict list, avoiding N+1 queries.
    """
    bookmarks_qs = Bookmark.objects.only("chat_message", "user")
    if request_user:
        bookmarks_qs = bookmarks_qs.filter(user=request_user)

    # Map message_id → list of bookmark user_ids
    bookmark_user_map = defaultdict(set)
    for chat_message, user in bookmarks_qs.values_list("chat_message", "user"):
        bookmark_user_map[chat_message].add(user)

    # Quote message UUIDs (avoid N+1)
    message_uuids = {msg.uuid: msg for msg in full_messages}
    missing_quote_uuids = set()

    for msg in full_messages:
        if msg.quote:
            for q in msg.quote if isinstance(msg.quote, list) else [msg.quote]:
                try:
                    if isinstance(q, str):
                        q_uuid = UUID(q)
                    elif isinstance(q, UUID):
                        q_uuid = q
                    else:
                        continue

                    if q_uuid not in message_uuids:
                        missing_quote_uuids.add(q_uuid)
                except Exception:
                    continue

    if missing_quote_uuids:
        quoted_messages = (
            ChatMessage.objects.filter(uuid__in=missing_quote_uuids)
            .select_related("sender", "task", "submit_level", "schedule")
            .prefetch_related("chat_files", "tasks", "mentions")
        )
        message_uuids.update({m.uuid: m for m in quoted_messages})

    # Prefetch all reactions for the given messages in a single query
    reactions = Reaction.objects.filter(
        chat_message__uuid__in=message_uuids
    ).values("chat_message_id", "icon", "user_id")
    # Build reaction_map
    reaction_map = defaultdict(list)
    reaction_groups = defaultdict(lambda: defaultdict(list))
    for r in reactions:
        reaction_groups[r["chat_message_id"]][r["icon"]].append(r["user_id"])
    for msg_id, icon_dict in reaction_groups.items():
        reaction_map[msg_id] = [
            {"icon": icon, "users": user_ids}
            for icon, user_ids in icon_dict.items()
        ]

    # Prefetch all senders for the given messages in a single query
    sender_ids = [m.sender_id for m in full_messages]
    senders = (
        User.objects.filter(id__in=sender_ids)
        .select_related("profile")
        .only("id", "profile", "avatar", "avatar_color", "deleted_at")
    )
    main_org_map = {
        uo["user_id"]: {
            "id": uo["organization_id"],
            "name": uo["organization__name"]
            if uo["organization__deleted_at"] == None
            else f"{uo['organization__name']}{KEYWORDS['deleted']}",
            "uuid": uo["organization__uuid"],
        }
        for uo in UsersOrganizations.objects.filter(
            user__id__in=sender_ids, is_main=True
        ).values(
            "user_id",
            "organization_id",
            "organization__name",
            "organization__uuid",
            "organization__deleted_at",
        )
    }
    user_serialized_map = {
        user.id: UserPayloadMsgSerializer(
            user, context={"organizations": main_org_map.get(user.id)}
        ).data
        for user in senders
    }
    # Prefetch all submit level for the given messages in a single query
    submit_level_ids = [m.submit_level_id for m in full_messages]
    submit_level_map = {
        sm["id"]: {
            "id": sm["id"],
            "staff": sm["staff"],
            "organization": sm["organization"],
            "skill": {
                "id": sm["skill__id"],
                "name": sm["skill_name"],
            },
            "status": sm["status"],
            "comment": sm["comment"],
        }
        for sm in SubmitLevelHistory.objects.filter(id__in=submit_level_ids)
        .annotate(
            skill_name=Case(
                When(
                    skill__deleted_at__isnull=False,
                    then=Concat(F("skill__name"), Value(KEYWORDS["deleted"])),
                ),
                default=F("skill__name"),
                output_field=CharField(),
            )
        )
        .values(
            "id",
            "staff",
            "organization",
            "skill__id",
            "skill_name",
            "status",
            "comment",
        )
    }
    # Prefetch all tasks for the given messages in a single query
    m2m_task_ids = ChatMessage.tasks.through.objects.filter(
        chatmessage__in=full_messages
    ).values_list("task_id", flat=True)
    # Get task IDs from the ForeignKey (ChatMessage.task_id)
    fk_task_ids = [msg.task_id for msg in full_messages if msg.task_id]
    # Merge both and deduplicate
    all_task_ids = list(set(m2m_task_ids).union(fk_task_ids))
    raw_tasks = Task.objects.filter(id__in=all_task_ids).only("id", "title")
    task_map = {}
    for task in raw_tasks:
        if task.id not in task_map:
            task_map[task.id] = {
                "id": task.id,
                "title": task.title,
            }
    results = []
    for obj in full_messages:
        payload = build_message_payload(
            obj,
            user_serialized_map,
            bookmark_user_map,
            submit_level_map,
            task_map,
            reaction_map,
            message_uuids,
            request_user,
        )
        results.append(payload)

    return results


def build_message_payload(
    obj,
    user_serialized_map,
    bookmark_user_map,
    submit_level_map,
    task_map,
    reaction_map,
    message_uuids,
    request_user=None,
    is_deleted_override=None,
    visited=None,
):
    if visited is None:
        visited = set()

    is_deleted = (
        obj.deleted_at is not None
        if is_deleted_override is None
        else is_deleted_override
    )

    payload = {
        "id": obj.id,
        "uuid": str(obj.uuid),
        "message": None if is_deleted else obj.message,
        "sender": user_serialized_map[obj.sender_id],
        "is_edited": obj.is_edited,
        "is_bookmark": request_user.id in bookmark_user_map[obj.id]
        if request_user
        else False,
        "created_at": obj.created_at,
        "deleted_at": obj.deleted_at,
        "type": obj.type,
        "mentions": [u.id for u in obj.mentions.all()],
        "schedule_changes": obj.schedule_changes,
        "quote": [],
        "reply": None,
        "task": None,
        "organization": BaseOrganizationSerializer(obj.organization).data
        if obj.organization
        else None,
        "submit_level": submit_level_map.get(obj.submit_level_id)
        if obj.submit_level_id
        else None,
        "schedule": None,
        "tasks": [],
        "reactions": reaction_map.get(obj.id, []),
        "chat_files": ChatFileSerializer(obj.chat_files.all(), many=True).data
        if not is_deleted
        else [],
    }

    if obj.schedule and not obj.schedule.deleted_at:
        payload["schedule"] = {
            "id": obj.schedule_id,
            "title": obj.schedule.title,
            "is_all_day": obj.schedule.is_all_day,
        }

    if obj.task and not obj.task.deleted_at:
        payload["task"] = task_map.get(obj.task_id)

    if hasattr(obj, "tasks"):
        for task in obj.tasks.all():
            if task.id in task_map:
                payload["tasks"].append(task_map[task.id])

    if obj.reply and obj.reply.uuid in message_uuids:
        reply_msg = message_uuids[obj.reply.uuid]
        payload["reply"] = {
            "id": reply_msg.id,
            "uuid": str(reply_msg.uuid),
            "message": reply_msg.message,
            "sender": user_serialized_map[reply_msg.sender_id],
        }

    if obj.quote:
        for nested_uuid in (
            obj.quote if isinstance(obj.quote, list) else [obj.quote]
        ):
            nested_payload = build_quote_payload(
                nested_uuid,
                message_uuids,
                user_serialized_map,
                bookmark_user_map,
                submit_level_map,
                task_map,
                reaction_map,
                request_user,
                visited,
            )
            if nested_payload:
                payload["quote"].append(nested_payload)

    return payload


def build_quote_payload(
    uuid_str,
    message_uuids,
    user_serialized_map,
    bookmark_user_map,
    submit_level_map,
    task_map,
    reaction_map,
    request_user=None,
    visited=None,
):
    """
    Recursively builds a message-like payload for a quoted message UUID.
    """
    if visited is None:
        visited = set()

    try:
        if isinstance(uuid_str, str):
            q_uuid = UUID(uuid_str)
        elif isinstance(uuid_str, UUID):
            q_uuid = uuid_str
        else:
            return None
    except (TypeError, ValueError):
        return None

    if q_uuid in visited:
        return None  # Prevent infinite recursion

    quoted_obj = message_uuids.get(q_uuid)
    if not quoted_obj:
        return None

    visited.add(q_uuid)

    return build_message_payload(
        quoted_obj,
        user_serialized_map,
        bookmark_user_map,
        submit_level_map,
        task_map,
        reaction_map,
        message_uuids,
        request_user,
        visited=visited,
    )
