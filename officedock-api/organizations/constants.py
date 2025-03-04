from base.constants import EnumChoices


class WorkTypes(EnumChoices):
    """
    WorkTypes constants.
    """

    GENERAL = "一般"
    MANAGEMENT = "管理"
    SPECIALIZED = "専任"


class CategoryColors(EnumChoices):
    """
    CategoryColors constants.
    """

    RED = "#D7576A"
    ORANGE = "#F0865F"
    GREEN = "#2E9267"
    BLUE = "#1772B6"
    PURPLE = "#826AC4"
    PINK = "#FC8EA2"
    YELLOW = "#EDC45D"
    LIGHT_GREEN = "#70CB7E"
    LIGHT_BLUE = "#45AFD9"
    LIGHT_PURPLE = "#899FEB"
