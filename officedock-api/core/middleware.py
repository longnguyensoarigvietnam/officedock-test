import traceback
from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from jwt import InvalidSignatureError, ExpiredSignatureError, DecodeError

from utils.jwt import JWTService

User = get_user_model()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        close_old_connections()
        try:
            if jwt_token_list := parse_qs(
                scope["query_string"].decode("UTF8")
            ).get("token", None):
                jwt_service = JWTService()
                jwt_token = jwt_token_list[0]
                jwt_payload = jwt_service.decode_token(jwt_token)
                scope["user"] = await self.get_logged_in_user(
                    jwt_payload["user_id"]
                )
            else:
                scope["user"] = AnonymousUser()
        except (
            InvalidSignatureError,
            KeyError,
            ExpiredSignatureError,
            DecodeError,
        ):
            traceback.print_exc()
        except:
            scope["user"] = AnonymousUser()
        return await self.app(scope, receive, send)

    async def get_logged_in_user(self, user_id):
        user = await self.get_user(user_id)
        return user

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()


def JWTAuthMiddlewareStack(app):
    return JWTAuthMiddleware(AuthMiddlewareStack(app))
