from base.constants import EnumChoices


class ThanksMessageTypes(EnumChoices):
    """
    Define types of thanks messages
    """

    SENT = "sent"
    RECEIVED = "received"
