from django.core.validators import FileExtensionValidator
from django.db import models

from base.models import BaseModel
from common.constants import (
    ALLOW_IMAGE_FORMATS,
    CROP_ITEM_FOLDER_UPLOAD,
    ITEM_FOLDER_UPLOAD,
)
from shop_items.constants import ItemTypes
from users.constants import CurrencyEnums


class ShopItems(BaseModel):
    """
    Shop items model
    """

    name = models.CharField()
    item_type = models.CharField(
        choices=ItemTypes.choices(), null=True, blank=True
    )
    price = models.IntegerField()
    color = models.CharField()
    type_price = models.CharField(
        choices=CurrencyEnums.choices(), null=True, blank=True
    )
    crop_file = models.ImageField(
        upload_to=CROP_ITEM_FOLDER_UPLOAD,
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOW_IMAGE_FORMATS),
        ],
        null=True,
        blank=True,
    )
    full_file = models.ImageField(
        upload_to=ITEM_FOLDER_UPLOAD,
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOW_IMAGE_FORMATS),
        ],
        null=True,
        blank=True,
    )


class UserItems(BaseModel):
    """
    User items model
    """

    company = models.ForeignKey(
        "companies.Company", related_name="user_items", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        "users.User", related_name="items", on_delete=models.CASCADE
    )
    item = models.ForeignKey(
        ShopItems, related_name="user_items", on_delete=models.CASCADE
    )
    item_type = models.CharField(
        choices=ItemTypes.choices(), null=True, blank=True
    )
    is_weared = models.BooleanField(default=False)
