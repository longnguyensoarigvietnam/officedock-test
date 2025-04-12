from django.db import migrations, transaction
import uuid


def seed_task_durations_by_user(apps, schema_editor):
    """
    Seed task duration by user
    """
    TaskDuration = apps.get_model("tasks", "TaskDuration")

    with transaction.atomic():
        for task_duration in TaskDuration.objects.filter(
            user__isnull=True
        ).all():
            if task_duration.task is not None:
                user = task_duration.task.people_in_charge.first()
                if user:
                    task_duration.user = user
                    task_duration.save()
            elif task_duration.schedule is not None:
                participants = task_duration.schedule.participants.all()
                if participants:
                    first_participant = participants.first()
                    task_duration.user = first_participant
                    task_duration.save()
                    if participants.count() > 1:
                        for participant in participants.exclude(
                            id=first_participant.id
                        ):
                            TaskDuration.objects.create(
                                schedule=task_duration.schedule,
                                user=participant,
                                uuid=uuid.uuid4(),
                                started_at=task_duration.started_at,
                                paused_at=task_duration.paused_at,
                                company=task_duration.company,
                                is_cancel_alert=False,
                            )


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0016_seed_task_durations_by_user"),
    ]

    operations = [
        migrations.RunPython(
            seed_task_durations_by_user, migrations.RunPython.noop
        ),
    ]
