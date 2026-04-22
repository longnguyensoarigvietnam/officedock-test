from django.core.management import BaseCommand
from django.db.models import Q

from skills.constants import SkillLevel
from skills.models import SkillMapSkillLevel, SkillMap
from submit_levels.constants import SubmitLevelStatus
from submit_levels.models import SubmitLevelHistory


class Command(BaseCommand):
    help = "Update all data skill map level"

    def handle(self, *args, **kwargs):
        skill_map_levels = SkillMapSkillLevel.objects.filter(
            Q(measure_time=0)
            | Q(measure_count=0)
            | Q(look_back_interval__isnull=True)
            | Q(look_back_type__isnull=True)
        ).all()
        for skill_map_level in skill_map_levels:
            skill_map_level.measure_count = (
                skill_map_level.skill_level.measure_count
            )
            skill_map_level.measure_time = (
                skill_map_level.skill_level.measure_time
            )
            skill_map_level.look_back_interval = (
                skill_map_level.skill_level.look_back_interval
            )
            skill_map_level.look_back_type = (
                skill_map_level.skill_level.look_back_type
            )
            skill_map_level.save()

        submit_levels = SubmitLevelHistory.objects.filter(
            level_after_submit=SkillLevel.LEVEL_3.value,
            status=SubmitLevelStatus.APPROVE.value,
        )
        for submit_level in submit_levels:
            SkillMap.objects.filter(
                skill=submit_level.skill,
                staff=submit_level.staff,
                organization=submit_level.organization,
                step=submit_level.step_after_submit,
                is_complete=False,
            ).update(
                is_complete=True,
            )
        self.stdout.write(
            self.style.SUCCESS(f"Successfully update data skill map level")
        )
