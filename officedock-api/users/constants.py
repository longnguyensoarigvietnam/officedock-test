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
