from base.constants import EnumChoices


class RoleTypes(EnumChoices):
    """
    RoleTypes constants.
    """

    OPERATION_ADMIN = "運用管理者"
    SYSTEM_ADMIN = "システム管理者"
    MANAGER = "経営者"
    DEPARTMENT_MANAGER = "部門長"
    GENERAL = "一般"


class GenderTypes(EnumChoices):
    """
    GenderTypes constants.
    """

    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class StepsRegisterTypes(EnumChoices):
    """
    StepsRegister constants.
    """

    VERIFY_EMAIL = 1
    VERIFY_OTP = 2
    DONE = 3


class VerifyTokenTypes(EnumChoices):
    """
    VerifyTokenTypes constants.
    """

    REGISTRATION = "REGISTRATION"
    LOGIN = "LOGIN"
    RESET_PASSWORD = "RESET_PASSWORD"


class LoginTypes(EnumChoices):
    """
    Login types constants.
    """

    EMAIL = "EMAIL"
    USERNAME = "USERNAME"


DEFAULT_OTP_ATTEMPTS = 0


class AvatarColors(EnumChoices):
    """
    AvatarColors constants.
    """

    RED = "#154a9c"
    ORANGE = "#e85d7e"
    GREEN = "#47ba7c"
    BLUE = "#154a9c"
    PURPLE = "#7940b2"
    PINK = "#FC8EA2"
    YELLOW = "#f3c54f"
    LIGHT_GREEN = "#9fe16c"
    LIGHT_BLUE = "#0068B6"
    LIGHTER_BLUE = "#73d0e8"
    LIGHT_RED = "#e85d7e"
    GRAY = "#83919E"
    FRESH_CYAN = "#00C4CC"  # Vibrant cyan
    FRESH_TEAL = "#1ABC9C"  # Rich teal
    FRESH_LIME = "#A8E63F"  # Bright lime green
    FRESH_AQUA = "#22D4FD"  # Electric aqua blue
    FRESH_INDIGO = "#4B0082"  # Deep indigo
    FRESH_CORAL = "#FF6F61"  # Warm coral
    FRESH_GOLD = "#FFC72C"  # Rich golden yellow
    FRESH_VIOLET = "#8A2BE2"  # Deep violet
    FRESH_TURQUOISE = "#40E0D0"  # Soft turquoise
    FRESH_MAROON = "#800000"  # Classic maroon
    FRESH_SAND = "#F4A460"  # Sandy brown
    FRESH_OLIVE = "#808000"  # Muted olive green


class TransactionTypes(EnumChoices):
    # Earn methods
    TASK_COMPLETE = "タスク完了"  # Task Completed
    LOGIN_BONUS = "ログインボーナス"  # Login Bonus
    TUTORIAL = "チュートリアル"  # Tutorial

    # Usage methods
    WORK_TIME = "作業時間計測"  # Work Time Measurement
    THANKS_MSG = "サンクスポイント"  # Thanks Message
    VOTE_MVP = "MVP投票"  # Vote MVP
    SKILL_UP = "スキルアップ"  # Skill Up

    # Others
    EXCHANGE = "ポイント交換"  # Point Exchange
    BUY_ITEM = "アイテム交換"
    OTHER = "その他"  # Other


class CurrencyEnums(EnumChoices):
    COIN = "COIN"
    PEARL = "PEARL"


# Define coin rewards
COIN_VOTE_MVP = 200
COIN_THANKS_MSG = 50
COIN_WORK_TIME = 10
COIN_SKILL_UP_STEP1 = 300
COIN_SKILL_UP_STEP2 = 600
COIN_SKILL_UP_STEP3 = 1000

# Define pearl rewards
PEARL_TASK_COMPLETE = 100
PEARL_LOGIN_BONUS = 50
PEARL_TUTORIAL = 5000


class UserActivityTypes(EnumChoices):
    """
    User activity types constants.
    """

    USER_CREATED = "USER_CREATED"
    USER_DELETED = "USER_DELETED"
