from datetime import timedelta
import jwt

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from base.constants import DEFAULT_TOKEN_SECONDS_EXPIRATION
from base.messages import ERROR_MESSAGES


class JWTService:
    @staticmethod
    def encode_token(data_id, email, expires=DEFAULT_TOKEN_SECONDS_EXPIRATION):
        expiration = timezone.now() + timedelta(seconds=expires)
        return jwt.encode(
            {
                "id": str(data_id),
                "email": email,
                "exp": expiration,
            },
            settings.SECRET_KEY,
            algorithm="HS256",
        )

    @staticmethod
    def decode_token(token):
        try:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except (jwt.DecodeError, jwt.ExpiredSignatureError) as exc:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["token_invalid"]]}
            ) from exc
