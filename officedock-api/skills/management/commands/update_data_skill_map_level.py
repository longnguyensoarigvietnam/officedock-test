from django.core.management import BaseCommand
from django.db.models import Q

from skills.models import SkillMapSkillLevel


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
        self.stdout.write(
            self.style.SUCCESS(f"Successfully update data skill map level")
        )
