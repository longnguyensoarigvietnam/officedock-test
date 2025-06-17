from base.constants import EnumChoices

NONE_CATEGORY = "未設定"
ALL_TEAM = "すべてのチーム"


class FilterTime(EnumChoices):
    """
    Filter Time constants
    """

    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"
    YEAR = "YEAR"
