from base.constants import EnumChoices


DEFAULT_TIME = "00:00:00"


class SkillLevel(EnumChoices):
    """
    SkillLevel constants.
    """

    LEVEL_1 = "レベル1"
    LEVEL_2 = "レベル2"
    LEVEL_3 = "レベル3"


SkillLevelConstantArray = [
    SkillLevel.LEVEL_1.value,
    SkillLevel.LEVEL_2.value,
    SkillLevel.LEVEL_3.value,
]


class SkillStep(EnumChoices):
    """
    SkillStep constants.
    """

    STEP_1 = "ステップ1"
    STEP_2 = "ステップ2"
    STEP_3 = "ステップ3"


class LookBackTypes(EnumChoices):
    """
    LookBackTypes constants.
    """

    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"
    YEAR = "YEAR"
