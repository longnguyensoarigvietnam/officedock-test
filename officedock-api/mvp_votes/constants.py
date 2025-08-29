from base.constants import EnumChoices

DEFAULT_BONUS_POINT = 200
DEFAULT_CONTENT_TWEET_START_VOTE = "MVPの投票を受け付けています！ 最も輝いていたメンバーを推薦しよう！"
DEFAULT_CONTENT_TWEET_END_VOTE = "MVP投票の結果が公開されました。"


class MVPVoteTypes(EnumChoices):
    """
    Timeline constants.
    """

    UPCOMING = "UPCOMING"
    PAST = "PAST"
    PRESENT = "PRESENT"
