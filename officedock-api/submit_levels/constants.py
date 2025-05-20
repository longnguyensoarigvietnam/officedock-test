from base.constants import EnumChoices


class SubmitLevelStatus(EnumChoices):
    """
    SubmitLevelStatus constants.
    """

    APPLYING = "申請中"
    APPROVE = "承認"
    REJECT = "却下"
    DRAFT = "ドラフト"
