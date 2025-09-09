from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from shop_items.models import ShopItems
from shop_items.constants import ItemTypes
from common.utils import generate_file_name
from users.constants import CurrencyEnums


class Command(BaseCommand):
    help = "Seed ShopItems from templates/files folder."

    def handle(self, *args, **options):
        # Clean Shop items
        ShopItems.objects.all().delete()
        templates_dir = Path(settings.BASE_DIR) / "templates" / "files"
        if not templates_dir.exists():
            raise CommandError(
                f"Templates directory not found: {templates_dir}"
            )

        # Map folder -> ItemTypes
        folder_type_map = {
            "hats": ItemTypes.HAT.value,
            "clothes": ItemTypes.CLOTHES.value,
            "shoes": ItemTypes.SHOES.value,
        }

        # Map folder -> desired Japanese name prefix
        # TODO: Replace actual name when client provider
        name_prefix_map = {
            "hats": "マイルくんの帽子",
            "clothes": "マイルくんの服",
            "shoes": "マイルくんの靴",
        }

        def _parse_color_from_filename(filename: str) -> str:
            stem = Path(filename).stem  # e.g. shoes_1_bk
            parts = stem.split("_")
            code = parts[-1].lower() if parts else ""

            # TODO: Fix color if use RGB
            code_map = {
                "bk": "black",
                "black": "black",
                "bl": "blue",
                "blue": "blue",
                "rd": "red",
                "red": "red",
                "yl": "yellow",
                "y": "yellow",
                "yellow": "yellow",
                "ye": "yellow",
                "gr": "green",
                "green": "green",
                "gy": "gray",
                "grey": "gray",
                "gray": "gray",
                "wh": "white",
                "white": "white",
                "br": "brown",
                "brown": "brown",
                "pk": "pink",
                "pink": "pink",
                "or": "orange",
                "org": "orange",
                "orange": "orange",
                "pr": "purple",
                "pu": "purple",
                "violet": "purple",
                "purple": "purple",
                "pur": "purple",
                "lb": "light_blue",
                "lp": "light_pink",
                "yg": "yellow_green",
            }
            return code_map.get(code, code)

        created = 0

        for folder_name, item_type_value in folder_type_map.items():
            folder_path = templates_dir / folder_name
            if not folder_path.exists():
                self.stdout.write(
                    self.style.WARNING(f"Skip missing folder: {folder_path}")
                )
                continue

            # Only take image files and sort by filename for stable ordering
            files = sorted(
                [
                    p
                    for p in folder_path.iterdir()
                    if p.is_file()
                    and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
                ],
                key=lambda p: p.name,
            )

            # Set name: "<type-specific prefix><index>"
            for idx, entry in enumerate(files, start=1):
                desired_name = name_prefix_map.get(folder_name, item_type_value)
                color_value = _parse_color_from_filename(entry.name)

                # Create if missing by (name + item_type) to keep idempotency based on file order
                obj, was_created = ShopItems.objects.get_or_create(
                    name=desired_name,
                    item_type=item_type_value,
                    color=color_value,
                    defaults={
                        "price": 5000,
                        "type_price": CurrencyEnums.PEARL.value,
                    },
                )

                # Save/replace files
                with entry.open("rb") as f:
                    data = f.read()

                if not was_created:
                    # Always remove old files on update
                    if obj.crop_file:
                        obj.crop_file.delete(save=False)
                    if obj.full_file:
                        obj.full_file.delete(save=False)

                obj.crop_file.save(
                    generate_file_name(), ContentFile(data), save=True
                )  # TODO: Replace crop file after clear QA
                obj.full_file.save(
                    generate_file_name(), ContentFile(data), save=True
                )

                if not was_created:
                    updated = True

                if was_created:
                    created += 1
                    self.stdout.write(
                        f"CREATE {folder_name}: {desired_name} -> {entry.name} (color={color_value})"
                    )
                else:
                    status = "UPDATED" if updated else "EXISTS"
                    self.stdout.write(
                        f"{status} {folder_name}: {desired_name} -> {entry.name} (color={obj.color})"
                    )

        self.stdout.write(self.style.SUCCESS(f"Done. created={created}"))
