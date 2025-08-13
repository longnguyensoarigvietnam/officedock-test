from base.constants import EnumChoices


class SurveyFilterTypes(EnumChoices):
    """
    Define filter types for survey listing
    """

    ALL = "all"
    OPEN = "open"
    CLOSED = "closed"
    MY_SURVEY = "my_survey"
