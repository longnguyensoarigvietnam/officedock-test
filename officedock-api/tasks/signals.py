# signals.py
from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver

from tasks.constants import TaskStatus
from tasks.models import Task
from users.models import TaskRewardLog


@receiver(post_save, sender=Task)
def task_status_changed(sender, instance, created, **kwargs):
    """
    Handle reward logs when task status changes.
    """
    if not created:
        assigned_users = instance.people_in_charge.all()

        if instance.status_name == TaskStatus.COMPLETED.value:
            # Task completed → ensure reward logs exist
            for user in assigned_users:
                TaskRewardLog.objects.get_or_create(
                    task=instance,
                    user=user,
                    defaults={"company_id": user.company_id},
                )
        else:
            # Task not completed → remove unrewarded logs
            TaskRewardLog.objects.filter(
                task=instance,
                user__in=assigned_users,
                rewarded_at__isnull=True,
            ).delete()


@receiver(m2m_changed, sender=Task.people_in_charge.through)
def task_people_in_charge_changed(sender, instance, action, pk_set, **kwargs):
    """
    Handle reward logs when assigned users are changed.
    """
    if instance.status_name == TaskStatus.COMPLETED.value:
        if action == "post_add":
            # New users assigned
            new_users = instance.people_in_charge.filter(pk__in=pk_set)
            for user in new_users:
                TaskRewardLog.objects.get_or_create(
                    task=instance,
                    user=user,
                    defaults={"company_id": user.company_id},
                )

        elif action == "post_remove":
            # Users removed → delete logs (only if not rewarded yet)
            TaskRewardLog.objects.filter(
                task=instance,
                user_id__in=pk_set,
                rewarded_at__isnull=True,
            ).delete()
