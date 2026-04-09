# Generated migration for adding furigana field to Tag model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tags", "0004_remove_tag_is_hidden"),
    ]

    operations = [
        migrations.AddField(
            model_name="tag",
            name="furigana",
            field=models.CharField(
                blank=True,
                help_text="Furigana or phonetic reading of the tag name (e.g., ふりがな)",
                max_length=255,
                null=True,
            ),
        ),
    ]
