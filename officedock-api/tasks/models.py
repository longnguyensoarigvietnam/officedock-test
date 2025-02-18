import uuid
from django.db import models
from django.db.models import Max

from base.models import BaseModel
from tasks.constants import (
    INDEX_INCREMENT,
    INITIAL_INDEX_VALUE,
    TaskTypes,
    TaskPriorities,
)
from users.models import User


class Task(BaseModel):
    """
    Task model.
    """

    title = models.CharField(null=True, blank=True)
    type = models.CharField(
        choices=TaskTypes.choices(), max_length=100, null=True, blank=True
    )
    status = models.ForeignKey(
        "TaskStatus", on_delete=models.SET_NULL, null=True, blank=True
    )
    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="tasks",
    )
    priority = models.CharField(
        choices=TaskPriorities.choices(), max_length=100, null=True, blank=True
    )
    deadline = models.DateTimeField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    tags = models.ManyToManyField(
        "tags.Tag",
        through="TagsTasks",
        related_name="tasks",
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="tasks",
        on_delete=models.CASCADE,
    )
    people_in_charge = models.ManyToManyField(
        "users.User",
        through="PeopleInChargeTasks",
        related_name="in_charge_tasks",
    )
    status_name = models.CharField(null=True, blank=True)
    is_start = models.BooleanField(default=False)
    is_important = models.BooleanField(default=False)
    remind_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    def save(self, *args, **kwargs):
        """
        Set default task
        """
        if self.status:
            self.status_name = self.status.name
        super().save(*args, **kwargs)


class TodoList(BaseModel):
    """
    Todo list model.
    """

    task = models.ForeignKey(
        "Task", related_name="todo_list", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="todo_list",
        on_delete=models.CASCADE,
    )
    index = models.IntegerField(null=True, default=1)
    content = models.TextField()
    checked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "users.User",
        related_name="todo_list",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.task.company
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["index"]


class TaskSchedule(BaseModel):
    """
    Task schedule model.
    """

    task = models.ForeignKey(
        "Task", related_name="task_schedules", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="task_schedules",
        on_delete=models.CASCADE,
    )
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)
    plan_start_date = models.DateTimeField()
    plan_end_date = models.DateTimeField()

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.task.company
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["id"]


class TagsTasks(BaseModel):
    """
    Tags tasks model.
    """

    tag = models.ForeignKey(
        "tags.Tag",
        related_name="tags_tasks",
        on_delete=models.CASCADE,
    )
    task = models.ForeignKey(
        "Task", related_name="tags_tasks", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="tags_tasks",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.task.company
        super().save(*args, **kwargs)


class PeopleInChargeTasks(BaseModel):
    """
    Users tasks model.
    """

    user = models.ForeignKey(
        "users.User",
        related_name="people_in_charge_tasks",
        on_delete=models.CASCADE,
    )
    task = models.ForeignKey(
        "Task", related_name="people_in_charge_tasks", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="people_in_charge_tasks",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        self.company = self.user.company
        super().save(*args, **kwargs)


class TaskIndex(BaseModel):
    """
    Task index model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    index = models.FloatField()
    user = models.ForeignKey(
        "users.User",
        related_name="task_index",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    task = models.ForeignKey(
        "Task", related_name="task_index", on_delete=models.CASCADE
    )
    pin_at = models.DateTimeField(null=True, blank=True)
    company = models.ForeignKey(
        "companies.Company",
        related_name="task_indexes",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.index is None:
            last_task_index = TaskIndex.objects.filter(
                user=self.user
            ).aggregate(Max("index"))

            self.index = (
                last_task_index["index__max"] + INDEX_INCREMENT
                if last_task_index["index__max"] is not None
                else INITIAL_INDEX_VALUE
            )

        self.company = self.task.company
        super().save(*args, **kwargs)

    def update_max_index_for_user(user: User, task: Task, is_update=True):
        """
        Update last index if add new user
        """
        # Calculate the maximum index for the given user
        max_index = TaskIndex.objects.filter(user=user).aggregate(Max("index"))[
            "index__max"
        ]

        # Determine the new index value
        new_index = (
            (max_index + INDEX_INCREMENT)
            if max_index is not None
            else INITIAL_INDEX_VALUE
        )

        if is_update:
            # Update the index if the TaskIndex entry exists
            TaskIndex.objects.filter(task=task, user=user).update(
                index=new_index
            )
        else:
            # Create the TaskIndex entry if it doesn't already exist
            if not TaskIndex.objects.filter(task=task, user=user).exists():
                TaskIndex.objects.create(
                    task=task,
                    user=user,
                    company=task.company,
                    index=new_index,
                )

    def update_index_for_user(
        user: User, task: Task, is_update=True, index=None
    ):
        """
        Update last index if add new user
        """

        if is_update:
            # Update the index if the TaskIndex entry exists
            TaskIndex.objects.filter(task=task, user=user).update(index=index)
        else:
            # Create the TaskIndex entry if it doesn't already exist
            if not TaskIndex.objects.filter(task=task, user=user).exists():
                TaskIndex.objects.create(
                    task=task,
                    user=user,
                    company=task.company,
                    index=index,
                )


class TaskStatus(BaseModel):
    """
    Task status model.
    """

    name = models.CharField(max_length=100)


class TaskDuration(BaseModel):
    """
    Task time model.
    """

    uuid = models.UUIDField(editable=False, default=uuid.uuid4, unique=True)
    task = models.ForeignKey(
        "Task",
        on_delete=models.CASCADE,
        related_name="task_durations",
        null=True,
        blank=True,
    )
    schedule = models.ForeignKey(
        "calendars.Schedule",
        on_delete=models.CASCADE,
        related_name="task_durations",
        null=True,
        blank=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    is_cancel_alert = models.BooleanField(default=False)
    company = models.ForeignKey(
        "companies.Company",
        related_name="task_durations",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.task:
            self.company = self.task.company
        if self.schedule:
            self.company = self.schedule.company

        super().save(*args, **kwargs)


class TaskFrequent(BaseModel):
    """
    Model to track frequently used tasks by users.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    count = models.IntegerField(default=0)
    user = models.ForeignKey(
        "users.User",
        related_name="task_frequents",
        on_delete=models.CASCADE,
    )
    task = models.ForeignKey(
        "Task", related_name="task_frequents", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="task_frequents",
        on_delete=models.CASCADE,
    )
