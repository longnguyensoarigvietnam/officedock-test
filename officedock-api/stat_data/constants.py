from base.constants import EnumChoices

NONE_CATEGORY = "未設定"
ALL_TEAM = "すべてのチーム"
MAIN_TEAM = "メインチーム"
SUB_TEAM = "サブチーム"
CALENDAR = "カレンダー"
MAIN_TEAM_COLOR = "#00C4CC"
SUB_TEAM_COLOR = "#1ABC9C"
CALENDAR_COLOR = "#A8E63F"


class FilterTime(EnumChoices):
    """
    Filter Time constants
    """

    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"
    YEAR = "YEAR"
