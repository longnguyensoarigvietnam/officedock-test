from users.models import User


def reset_sort_task(user):
    """
    Reset sort task for user
    """
    if isinstance(user, User) and hasattr(user, "setting"):
        user.setting.reset_sort_task()
