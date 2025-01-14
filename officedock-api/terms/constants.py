from base.constants import EnumChoices


class TermStatus(EnumChoices):
    """
    Term status
    """

    DRAFT = "ドラフト"
    PUBLIC = "公開"


class TermTypes(EnumChoices):
    """
    Term types
    """

    TERM_OF_USE = "TERM_OF_USE"
    PRIVACY_POLICY = "PRIVACY_POLICY"
