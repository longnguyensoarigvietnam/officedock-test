from base.constants import EnumChoices


class ScheduleTypes(EnumChoices):
    """
    ScheduleTypes constants.
    """

    DISCUSSION = "打ち合わせ"
    MEETING = "会議"
    MOVEMENT = "移動"
    MEET = "面談"
    OTHER = "その他"


class CalendarTypes(EnumChoices):
    """
    Calendar types constants.
    """

    SCHEDULE = "SCHEDULE"
    TASK = "TASK"


class ScheduleFields(EnumChoices):
    """
    ScheduleFields constants.
    """

    TITLE = "タイトル"
    ORGANIZATION = "組織"
    DURATION = "実施予定日時"
    TYPE = "予定の種類"
    TAG = "集計タグ"
    LOCATION = "場所"
    PARTICIPANTS = "参加者"
    MEMO = "予定についてのメモ"
    IS_ALL_DAY = "終日"
    CATEGORY = "業務の種類"


class ScheduleCategoryTypes(EnumChoices):
    """
    ScheduleCategoryTypes constants.
    """

    LARGE = "LARGE"
    MEDIUM = "MEDIUM"
    SMALL = "SMALL"
