# Define ordering datetime field
ORDERING_DATETIME_FIELD = ["deadline"]

# Define regex
STRIP_TAGS = r"'<[^>]*>'"
DATE_REGEX = r"^\d{4}-\d{2}-\d{2}$"

# Define format
BASE_DATE_FORMAT = "%Y-%m-%d"
BASE_DATETIME_FORMAT = "%Y-%m-%d %H:%M"

# Define upload folders
ORGANIZATION_ICON_FOLDER_UPLOAD = (
    "organizations/icons"  # Folder for organization icons
)
USER_AVATAR_FOLDER_UPLOAD = "users/avatars"  # Folder for user avatars
CROP_ITEM_FOLDER_UPLOAD = (
    "items/crop_items"  # Folder for crop item in shop items
)
ITEM_FOLDER_UPLOAD = "items/full_items"  # Folder for item in shop items
ALLOW_IMAGE_FORMATS = [
    "jpg",
    "jpeg",
    "png",
    "webp",
]  # Allowed image formats for uploads
ORGANIZATION_ICON_UPLOAD_MAX_SIZE = 20 * 1024 * 1024  # 20MB
USER_AVATAR_UPLOAD_MAX_SIZE = 30 * 1024 * 1024  # 30MB
AVATAR_GCS_EXPIRATION_SECONDS = 24 * 60 * 60  # Expires in 1 day
RETRY_PAYMENT_MAX = 3
