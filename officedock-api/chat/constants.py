from base.constants import EnumChoices


class ChatMessageTypes(EnumChoices):
    """
    ChatMessageTypes constants.
    """

    MESSAGE = "MESSAGE"
    CREATION_TASK = "CREATION_TASK"
    EDIT_TASK = "EDIT_TASK"
    SUBMIT_LEVEL_SKILL = "SUBMIT_LEVEL_SKILL"
    CREATE_SUBMIT_LEVEL_SKILL = "CREATE_SUBMIT_LEVEL_SKILL"
    ADD_MEMBER_TASK = "ADD_MEMBER_TASK"
    REMOVE_MEMBER_TASK = "REMOVE_MEMBER_TASK"
    CREATION_SCHEDULE = "CREATION_SCHEDULE"
    EDIT_SCHEDULE = "EDIT_SCHEDULE"
    REMOVE_SCHEDULE = "REMOVE_SCHEDULE"
    REMOVE_TASK = "REMOVE_TASK"


class ChatRoomTypes(EnumChoices):
    """
    ChatRoomTypes constants.
    """

    SELF = "SELF"
    PRIVATE = "PRIVATE"
    GROUP = "GROUP"
    TASK = "TASK"
    SKILL = "SKILL"
    CALENDAR = "CALENDAR"


class ChatRoomNames(EnumChoices):
    """
    ChatRoomNames constants.
    """

    TASK_CARD = "タスク通知"
    SKILL_UP = "スキルマップ通知"
    CALENDAR = "カレンダー通知"


class WebSocketEventType(EnumChoices):
    """
    WebSocket event types constants.
    """

    ERROR = "ERROR"
    MESSAGE = "MESSAGE"
    CREATION_TASK = "CREATION_TASK"
    HIDE_ROOM = "HIDE_ROOM"
    SHOW_ROOM = "SHOW_ROOM"
    PIN_ROOM = "PIN_ROOM"
    UNPIN_ROOM = "UNPIN_ROOM"
    ADD_PARTICIPANT = "ADD_PARTICIPANT"
    REMOVE_PARTICIPANT = "REMOVE_PARTICIPANT"
    EDIT_MESSAGE = "EDIT_MESSAGE"
    DELETE_MESSAGE = "DELETE_MESSAGE"
    CREATE_CHAT_ROOM = "CREATE_CHAT_ROOM"
    UPDATE_CHAT_ROOM = "UPDATE_CHAT_ROOM"
    DELETE_TASK = "DELETE_TASK"
    TOTAL_UNREAD_MESSAGE = "TOTAL_UNREAD_MESSAGE"
    CHANGE_TASK_STATUS = "CHANGE_TASK_STATUS"
    CHANGE_ROLE = "CHANGE_ROLE"
    REMIND_TASK = "REMIND_TASK"
    DURATION_OVERTIME_WARNING = "DURATION_OVERTIME_WARNING"
    RESET_STATUS_SORT_TASK = "RESET_STATUS_SORT_TASK"
    SKILL_LEVEL_UP_COMPLETED = "SKILL_LEVEL_UP_COMPLETED"
    CREATE_TWEET = "CREATE_TWEET"


class TypeChatGroup(EnumChoices):
    """
    TypeChatGroup constants.
    """

    GROUP = "GROUP"
    PRIVATE = "PRIVATE"
    UNREAD = "UNREAD"


USER_ACTION_GROUP = "{}_user_action_group"
ROOM_TYPES = [
    (ChatRoomTypes.TASK, ChatRoomNames.TASK_CARD),
    (ChatRoomTypes.SKILL, ChatRoomNames.SKILL_UP),
    (ChatRoomTypes.CALENDAR, ChatRoomNames.CALENDAR),
]

CHAT_FILES_FOLDER_UPLOAD = "chats"
CHUNK_FILES_FOLDER_UPLOAD = "chunks"
FILE_UPLOAD_MAX_SIZE = 5 * 1024 * 1024 * 1024  # 5GB
