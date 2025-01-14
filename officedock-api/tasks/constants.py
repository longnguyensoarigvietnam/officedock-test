from base.constants import EnumChoices

DEFAULT_PAGE_SIZE = 4  # Set a default value or raise an error if necessary
INITIAL_INDEX_VALUE = 1  # Constant to define the initial index value when no existing index is found
INDEX_INCREMENT = 1  # Constant to define the increment value for index updates
COPY_TEXT = "コピー"  # Constant to define the text for the title task copy


class TaskTypes(EnumChoices):
    """
    WorkTypes constants.
    """

    GENERAL_TASK = "一般タスク"
    MANAGEMENT_TASK = "管理タスク"
    SPECIALIZED_TASK = "専任タスク"
    OTHER_TASK = "その他"
    MY_TEMPLATE = "マイテンプレート"


class TaskStatus(EnumChoices):
    """
    StatusTypes constants.
    """

    NOT_STARTED = "未着手"
    RESPONDING = "対応中"
    CONFIRMING = "確認中"
    COMPLETED = "完了"
    MY_ROUTINE = "マイルーティン"


class TaskPriorities(EnumChoices):
    """
    PriorityTypes constants.
    """

    HIGH = "高"
    MEDIUM = "中"
    LOW = "低"


class TaskCategoryTypes(EnumChoices):
    """
    TaskCategoryTypes constants.
    """

    LARGE = "LARGE"
    MEDIUM = "MEDIUM"
    SMALL = "SMALL"


# Define category default
TASK_WORK_TYPES = {
    TaskCategoryTypes.LARGE.value: ["大カテゴリ1", "大カテゴリ2", "大カテゴリ3"],
    TaskCategoryTypes.MEDIUM.value: ["中カテゴリ1", "中カテゴリ2", "中カテゴリ3"],
    TaskCategoryTypes.SMALL.value: ["小カテゴリ1", "小カテゴリ2", "小カテゴリ3"],
}
