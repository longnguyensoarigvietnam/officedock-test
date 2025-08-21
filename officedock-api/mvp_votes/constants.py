from base.constants import EnumChoices


class Timeline(EnumChoices):
    """
    Timeline constants.
    """

    FUTURE = "FUTURE"
    PAST = "PAST"
    PRESENT = "PRESENT"
