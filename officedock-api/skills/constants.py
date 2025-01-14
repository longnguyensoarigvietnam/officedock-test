from base.constants import EnumChoices


class SkillLevel(EnumChoices):
    """
    SkillLevel constants.
    """

    LEVEL_0 = "レベル0"
    LEVEL_1 = "レベル1"
    LEVEL_2 = "レベル2"
    LEVEL_3 = "レベル3"


def get_next_level(current_level):
    """Returns the next skill level based on the current level."""
    switch_case = {
        SkillLevel.LEVEL_0.value: SkillLevel.LEVEL_1.value,
        SkillLevel.LEVEL_1.value: SkillLevel.LEVEL_2.value,
        SkillLevel.LEVEL_2.value: SkillLevel.LEVEL_3.value,
        SkillLevel.LEVEL_3.value: SkillLevel.LEVEL_3.value,  # No next level after LEVEL_3
    }

    return switch_case.get(current_level, None)
