from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Delete a specified table from the database"

    def add_arguments(self, parser):
        # Add an argument to specify the table name
        parser.add_argument(
            "--table",
            type=str,
            help="Name of the table to delete",
            required=True,
        )

    def handle(self, *args, **options):
        table_name = options["table"]

        try:
            with connection.cursor() as cursor:
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            self.stdout.write(
                self.style.SUCCESS(f"Successfully deleted table: {table_name}")
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error deleting table: {e}"))
