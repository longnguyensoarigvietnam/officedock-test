from dateutil import rrule

from base.constants import EnumChoices

DEFAULT_PAGE_SIZE = 4  # Set a default value or raise an error if necessary
INITIAL_INDEX_VALUE = 10000  # Constant to define the initial index value when no existing index is found
INDEX_INCREMENT = (
    100  # Constant to define the increment value for index updates
)
LIMIT_DAY = 364  # Constant to define limit store loop date


class TaskTypes(EnumChoices):
    """
    WorkTypes constants.
    """

    GENERAL_TASK = "一般タスク"
    MANAGEMENT_TASK = "管理タスク"
    SPECIALIZED_TASK = "専任タスク"
    OTHER_TASK = "その他"
    MY_TEMPLATE = "マイテンプレート"


class TaskStatus(EnumChoices):
    """
    StatusTypes constants.
    """

    NOT_STARTED = "未着手"
    RESPONDING = "対応中"
    CONFIRMING = "確認中"
    COMPLETED = "完了"
    MY_ROUTINE = "固定タスク"


class TaskCategoryTypes(EnumChoices):
    """
    TaskCategoryTypes constants.
    """

    LARGE = "LARGE"
    MEDIUM = "MEDIUM"
    SMALL = "SMALL"


class DatetimeUnitTypes(EnumChoices):
    """
    DatetimeUnitTypes constants.
    """

    HOURS = "HOURS"
    DAY = "DAY"
    WEEK = "WEEK"


class FrequencyMap(EnumChoices):
    ONCE = "ONCE"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"

    @classmethod
    def to_rrule(cls, value):
        """Change enum to rrule value"""
        mapping = {
            cls.DAILY: rrule.DAILY,
            cls.WEEKLY: rrule.WEEKLY,
            cls.MONTHLY: rrule.MONTHLY,
            cls.YEARLY: rrule.YEARLY,
        }
        return mapping.get(value, None)


class CalculateSkillMapProcessCases(EnumChoices):
    NOT_CHANGE_COMPLETED_STATUS = "NOT_CHANGE_COMPLETED_STATUS"
    CHANGE_COMPLETED_STATUS_TO_ANOTHER = "CHANGE_COMPLETED_STATUS_TO_ANOTHER"
    CHANGE_ANOTHER_TO_COMPLETED_STATUS = "CHANGE_ANOTHER_TO_COMPLETED_STATUS"
    NOT_CHANGE_STATUS = "NOT_CHANGE_STATUS"
