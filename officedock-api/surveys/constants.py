from base.constants import EnumChoices

DEFAULT_CONTENT_TWEET_END_SURVEY = "アンケート集計の結果が公開されました。"


class SurveyFilterTypes(EnumChoices):
    """
    Define filter types for survey listing
    """

    ALL = "all"
    OPEN = "open"
    CLOSED = "closed"
    MY_SURVEY = "my_survey"
