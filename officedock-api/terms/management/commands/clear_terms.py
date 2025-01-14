from django.core.management.base import BaseCommand

from terms.models import Term


class Command(BaseCommand):
    help = "Clear terms"

    def handle(self, *args, **kwargs):
        Term.objects.all().delete()

        self.stdout.write(
            self.style.SUCCESS(f"Successfully clear data of Term")
        )
