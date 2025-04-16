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
ALLOW_IMAGE_FORMATS = [
    "jpg",
    "jpeg",
    "png",
    "webp",
]  # Allowed image formats for uploads
ORGANIZATION_ICON_UPLOAD_MAX_SIZE = 20 * 1024 * 1024  # 20MB
