from django.core.files.storage import default_storage


def remove_chat_files(chat_files):
    """
    Remove associated files when a chat message is deleted.
    """
    for chat_file in chat_files:
        # Delete the original file if it exists
        if chat_file.original_file and default_storage.exists(
            chat_file.original_file.name
        ):
            default_storage.delete(chat_file.original_file.name)

        # Delete the compressed file if it exists
        if chat_file.compressed_file and default_storage.exists(
            chat_file.compressed_file.name
        ):
            default_storage.delete(chat_file.compressed_file.name)

        # Remove the chat file record from the database
        chat_file.delete()
