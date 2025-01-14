from django.core.management.base import BaseCommand
from roles.constants import GENERAL_PERMISSIONS
from users.constants import RoleTypes
from users.models import Permission, Role, RoleDetail


class Command(BaseCommand):
    help = "Update data into role Permissions."

    def handle(self, *args, **kwargs):
        # Retrieve or create the role based on the role name
        roles = Role.objects.exclude(name__in=[role.name for role in RoleTypes])
        for role in roles:
            for screen_name, actions in GENERAL_PERMISSIONS.items():
                for action_name, selection_result in actions.items():
                    permission_obj = Permission.objects.filter(
                        name=f"{screen_name}_{action_name}"
                    ).first()
                    if permission_obj:
                        # Create a RoleDetail entry for the role, screen, and action
                        RoleDetail.objects.get_or_create(
                            role=role,
                            permission=permission_obj,
                            defaults={"selection_result": selection_result},
                        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully update role permissions into the database."
            )
        )
