from pathlib import Path

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from shop_items.constants import ItemTypes, ItemDefaultEnums
from common.utils import generate_file_name
from users.constants import CurrencyEnums


def seed_shop_items_data(apps, schema_editor):
    ShopItems = apps.get_model("shop_items", "ShopItems")
    UserItems = apps.get_model("shop_items", "UserItems")
    User = apps.get_model("users", "User")

    # Map ItemTypes to ItemDefaultEnums
    item_type_enum_map = {
        ItemTypes.HAT.value: ItemDefaultEnums.HAT.value,
        ItemTypes.CLOTHES.value: ItemDefaultEnums.CLOTHES.value,
        ItemTypes.SHOES.value: ItemDefaultEnums.SHOES.value,
    }

    created = 0
    updated = 0

    for item_type_value, item_enum_data in item_type_enum_map.items():
        if not item_enum_data:
            continue

        for item_data in item_enum_data:
            # Extract filename from path
            file_path = Path(item_data["path"])
            filename = file_path.name

            # Construct full file path for Cloud Run compatibility
            full_file_path = Path(settings.BASE_DIR) / file_path

            # Check if file exists before processing
            if not full_file_path.exists():
                print(
                    f"File not found: {full_file_path}, skipping item: {item_data['key']}"
                )
                continue

            # Use name from enum data
            desired_name = item_data["name"]

            # Create or update ShopItem
            obj, was_created = ShopItems.objects.update_or_create(
                key=item_data["key"],
                defaults={
                    "item_type": item_type_value,
                    "name": desired_name,
                    "color": item_data["color"],
                    "price": item_data["price"],
                    "type_price": CurrencyEnums.PEARL.value,
                },
            )

            if item_data["default"]:
                for user in User.objects.all():
                    UserItems.objects.get_or_create(
                        company=user.company,
                        user=user,
                        item=obj,
                        item_type=item_type_value,
                        is_equipped=True,
                    )

            # Save/replace files
            try:
                with full_file_path.open("rb") as f:
                    data = f.read()

                if not was_created:
                    # Always remove old files on update
                    if obj.crop_file:
                        obj.crop_file.delete(save=False)
                    if obj.full_file:
                        obj.full_file.delete(save=False)

                obj.crop_file.save(
                    generate_file_name(), ContentFile(data), save=True
                )
                obj.full_file.save(
                    generate_file_name(), ContentFile(data), save=True
                )

                if was_created:
                    created += 1
                    print(
                        f"CREATE {item_type_value}: {desired_name} -> {filename} (key={item_data['key']}, color={item_data['color']}, default={item_data['default']})"
                    )
                else:
                    updated += 1
                    print(
                        f"UPDATE {item_type_value}: {desired_name} -> {filename} (key={item_data['key']}, color={item_data['color']}, default={item_data['default']})"
                    )

            except Exception as e:
                print(f"Error processing file {full_file_path}: {str(e)}")
                continue

    print(f"Done. created={created}, updated={updated}")


class Command(BaseCommand):
    help = "Seed ShopItems from ItemDefaultEnums."

    def handle(self, *args, **options):
        try:
            seed_shop_items_data()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error: {e}"))
            return

        self.stdout.write(
            self.style.SUCCESS("Successfully seed data shop items")
        )
