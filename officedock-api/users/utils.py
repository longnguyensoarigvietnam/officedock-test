from chat.constants import WebSocketEventType
from common.utils import send_web_socket_event
from users.models import User


def reset_sort_task(user):
    """
    Reset sort task for user
    """
    if isinstance(user, User) and hasattr(user, "setting"):
        if (
            user.setting.is_sorting_task_by_deadline
            or user.setting.is_sorting_task_by_important
        ):
            user.setting.reset_sort_task()
            send_web_socket_event(
                {
                    "is_sorting_task_by_deadline": False,
                    "is_sorting_task_by_important": False,
                    "action": WebSocketEventType.RESET_STATUS_SORT_TASK.value,
                },
                user=user,
            )
