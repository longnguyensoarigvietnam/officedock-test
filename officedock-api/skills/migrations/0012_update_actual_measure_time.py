from django.db import migrations

from skills.constants import DEFAULT_TIME


def change_type_data_actual_measure_time(apps, schema_editor):
    """
    Change data type of actual measure time
    """
    SkillMapSkillLevel = apps.get_model("skills", "SkillMapSkillLevel")
    for skill_map_level in SkillMapSkillLevel.objects.all():
        if skill_map_level.actual_measure_time in [None, "0", 0]:
            skill_map_level.actual_measure_time = DEFAULT_TIME
        else:
            time = (
                skill_map_level.actual_measure_time
                if int(skill_map_level.actual_measure_time) > 9
                else "0" + skill_map_level.actual_measure_time
            )
            skill_map_level.actual_measure_time = f"{time}:00:00"
        skill_map_level.save()


class Migration(migrations.Migration):

    dependencies = [
        ("skills", "0011_skillmapskilllevel_skill_and_more"),
    ]

    operations = [
        migrations.RunPython(
            change_type_data_actual_measure_time, migrations.RunPython.noop
        ),
    ]
