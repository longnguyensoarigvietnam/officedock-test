from base.constants import EnumChoices

DEFAULT_BONUS_POINT = 200


class Timeline(EnumChoices):
    """
    Timeline constants.
    """

    FUTURE = "FUTURE"
    PAST = "PAST"
    PRESENT = "PRESENT"
