from rest_framework import status
from rest_framework.exceptions import APIException
from base.messages import ERROR_MESSAGES


class LockedError(APIException):
    status_code = status.HTTP_423_LOCKED
    default_detail = ERROR_MESSAGES["locked_error"]
    default_code = "locked"
