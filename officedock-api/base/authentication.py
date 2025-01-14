import base64
import binascii
import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from base.messages import ERROR_MESSAGES


class SwaggerBasicAuthentication(BaseAuthentication):
    """
    Custom basic authentication for Swagger.
    """

    def authenticate(self, request):
        """
        Authenticate a request with Swagger.
        """

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        auth_type, auth_credentials = auth_header.split(" ", 1)
        if auth_type.lower() != "basic":
            return None

        try:
            try:
                decoded_credentials = base64.b64decode(auth_credentials).decode(
                    "utf-8"
                )
            except UnicodeDecodeError:
                decoded_credentials = base64.b64decode(auth_credentials).decode(
                    "latin-1"
                )
            username, password = decoded_credentials.split(":", 1)
        except (TypeError, ValueError, UnicodeDecodeError, binascii.Error):
            raise AuthenticationFailed(ERROR_MESSAGES["invalid_basic_auth"])

        if self.authenticate_credentials(username, password):
            # Create a mock user object
            user = type(
                "User",
                (object,),
                {"id": None, "is_authenticated": True, "username": username},
            )()
            return (user, None)

        raise AuthenticationFailed(ERROR_MESSAGES["invalid_basic_auth"])

    def authenticate_credentials(self, username, password):
        """
        Authenticate credentials from ENV.
        """

        env_username = os.getenv("BASIC_AUTH_EMAIL")
        env_password = os.getenv("BASIC_AUTH_PASSWORD")
        return username == env_username and password == env_password

    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the `WWW-Authenticate`.
        """

        return 'Basic realm="api"'
