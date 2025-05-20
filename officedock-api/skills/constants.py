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


def get_next_progression(current_step, current_level):
    """Returns the next (step, level) progression based on current step and level."""
    steps = list(SkillStep)
    levels = list(SkillLevel)

    try:
        current_level_index = levels.index(SkillLevel(current_level))
        current_step_index = steps.index(SkillStep(current_step))
    except ValueError:
        return None  # Invalid input

    if current_level_index < len(levels) - 1:
        # Move to next level in same step
        return (
            steps[current_step_index].value,
            levels[current_level_index + 1].value,
        )
    else:
        # Move to LEVEL_1 in next step, if exists
        if current_step_index < len(steps) - 1:
            return steps[current_step_index + 1].value, SkillLevel.LEVEL_1.value
        else:
            # Already at final step and final level
            return (
                steps[current_step_index].value,
                levels[current_level_index].value,
            )
