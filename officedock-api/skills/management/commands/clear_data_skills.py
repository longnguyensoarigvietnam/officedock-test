from django.core.management import BaseCommand

from skills.models import Skill


class Command(BaseCommand):
    help = "Clear all data skills"

    def handle(self, *args, **kwargs):
        Skill.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(f"Successfully clear skills"))
