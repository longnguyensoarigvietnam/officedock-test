from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tasks"

    def ready(self) -> None:
        from tasks import (
            signals,
        )  # pylint: disable=unused-import,import-outside-toplevel,import-error,no-name-in-module
