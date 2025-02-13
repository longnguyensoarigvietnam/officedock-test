from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    def ready(self) -> None:
        from users import (
            signals,
        )  # pylint: disable=unused-import,import-outside-toplevel,import-error,no-name-in-module
