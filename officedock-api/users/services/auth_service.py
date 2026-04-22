from datetime import timedelta
import os
import random
from django.contrib.auth import authenticate
from django.db.models import Q, ObjectDoesNotExist
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import AccessToken
from base.messages import ERROR_MESSAGES
from users.models import ResetPassword, User, UserVerification
from utils.mail import MailService
from users.constants import DEFAULT_OTP_ATTEMPTS, RoleTypes, VerifyTokenTypes
from utils.jwt import JWTService
from users.serializers import UserLoginSerializer
from base.constants import (
    ACCESS_TOKEN_LIFETIME,
    ACCESS_TOKEN_LIFETIME_REMEMBER,
    OTP_TOKEN_SECONDS_EXPIRATION,
)
from users.services.user_balance_service import UserService


class UserAuthService:
    def login(self, request, serializer_data, is_admin=True):
        """
        The common function to create login session.
        """

        if is_admin:
            user = User.active_objects.filter(
                email=serializer_data["email"],
                roles__name=RoleTypes.OPERATION_ADMIN.value,
            ).first()
        else:
            user = (
                User.active_objects.filter(
                    Q(email=serializer_data["username"])
                    | Q(username=serializer_data["username"])
                )
                .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
                .first()
            )

            user = (
                user
                if user and UserService().check_valid_company(user)
                else None
            )  # TODO: Maybe refactor logic when implement redirect to change payment method page

        user = authenticate(
            request,
            username_alias=user.username_alias if user else None,
            password=serializer_data["password"],
        )

        # Check role
        if not user:
            return False

        # Login without using 2FA
        if not user.is_two_factor_auth:
            remember_me = serializer_data.get("remember_me", False)
            token = AccessToken.for_user(user)
            token_lifetime = (
                ACCESS_TOKEN_LIFETIME_REMEMBER
                if remember_me
                else ACCESS_TOKEN_LIFETIME
            )
            token.set_exp(lifetime=timedelta(minutes=token_lifetime))
            user.login_token(token)

            return {
                "is_2fa": False,
                "access": str(token),
                "user": UserLoginSerializer(user).data,
            }

        try:
            user_verification = user.user_verification
        except ObjectDoesNotExist:
            UserVerification.objects.create(user=user)
            user_verification = user.user_verification

        token = JWTService.encode_token(
            user.id, user.email, OTP_TOKEN_SECONDS_EXPIRATION
        )

        otp_code = (
            "000000"
            if is_admin and user.email == os.getenv("ADMIN_EMAIL")
            else str(random.randint(100000, 999999))
        )

        user_verification.token = token
        user_verification.otp_code = otp_code
        user_verification.otp_attempts = DEFAULT_OTP_ATTEMPTS  # Reset counter

        # Send OTP code to user email
        email_service = MailService()
        email_service.send_system_login_otp(
            user.full_name, user.two_factor_auth_email, otp_code
        )
        user_verification.save()

        return {"is_2fa": True, "token": token}

    def resend_otp(self, token, is_admin=True):
        """
        Handle resend OTP code when login.
        """
        user_verification = UserVerification.objects.filter(token=token).first()

        if not user_verification:
            raise ValidationError({"detail": ERROR_MESSAGES["token_invalid"]})

        user = user_verification.user
        otp_code = (
            "000000"
            if is_admin and user.email == os.getenv("ADMIN_EMAIL")
            else str(random.randint(100000, 999999))
        )

        user_verification.otp_code = otp_code
        user_verification.otp_attempts = DEFAULT_OTP_ATTEMPTS  # Reset counter

        # Send OTP code to user email
        email_service = MailService()
        email_service.send_system_login_otp(
            user.full_name, user.two_factor_auth_email, otp_code
        )
        user_verification.save()

        return {"is_2fa": True, "token": token}

    def verify_login(self, serializer_data, is_admin=True):
        """
        The common function to verify login session.
        """

        token = serializer_data["token"]
        otp_code = serializer_data["otp_code"]
        remember_me = serializer_data.get("remember_me", False)
        user_verification = UserVerification.objects.filter(token=token).last()
        JWTService.decode_token(token)  # Check if token is expired or not

        if user_verification is None:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["login_session_invalid"]]}
            )

        if user_verification.otp_code != otp_code:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["otp_code_invalid"]]}
            )

        user = user_verification.user
        if (
            (
                is_admin
                and user.check_roles(
                    RoleTypes.OPERATION_ADMIN.value, exclude=True
                )
            )
            or (
                not is_admin
                and user.check_roles(RoleTypes.OPERATION_ADMIN.value)
            )
            or (not UserService().check_valid_company(user))
        ):
            return False

        token = AccessToken.for_user(user)
        token_lifetime = (
            ACCESS_TOKEN_LIFETIME_REMEMBER
            if remember_me
            else ACCESS_TOKEN_LIFETIME
        )
        token.set_exp(lifetime=timedelta(minutes=token_lifetime))
        # Reset login session
        user_verification.token = None
        user_verification.otp_code = None
        user_verification.save()
        user.login_token(token)

        return {
            "access": str(token),
            "user": UserLoginSerializer(user).data,
        }

    def verify_token(self, serializer_data, is_admin=True):
        """
        The common function to check if token is valid.
        """

        token = serializer_data["token"]
        verify_type = serializer_data.pop("verify_type", None)

        token_decoded = JWTService.decode_token(token)
        response_data = {
            "token": token,
        }

        if verify_type == VerifyTokenTypes.RESET_PASSWORD.value:
            reset_password = ResetPassword.objects.filter(token=token).last()
            user = User.objects.filter(pk=token_decoded.get("id")).first()

            if (
                not reset_password
                or (
                    is_admin
                    and user.check_roles(
                        RoleTypes.OPERATION_ADMIN.value, exclude=True
                    )
                )
                or (
                    not is_admin
                    and user.check_roles(RoleTypes.OPERATION_ADMIN.value)
                )
            ):
                raise ValidationError(
                    {"detail": [ERROR_MESSAGES["token_invalid"]]}
                )
        else:
            # Decode token and retrieve User Verification data
            user_verification = UserVerification.objects.filter(
                token=token
            ).first()
            if not user_verification:
                raise ValidationError(
                    {"detail": [ERROR_MESSAGES["token_invalid"]]}
                )

            if user_verification.user is None:
                response_data = {
                    "token": token,
                    "steps": user_verification.steps,
                }

        return response_data

    def forgot_password(self, serializer_data, is_admin=True):
        """
        The common function to forgot password.
        """

        email = serializer_data["email"]

        if is_admin:
            user = User.active_objects.filter(
                email=email, roles__name=RoleTypes.OPERATION_ADMIN.value
            ).first()
        else:
            user = (
                User.active_objects.filter(email=email)
                .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
                .first()
            )

        if not user:
            raise ValidationError({"email": [ERROR_MESSAGES["email_invalid"]]})

        reset_password = ResetPassword.create(user=user)

        mail_service = MailService()
        mail_service.send_system_forgot_password(
            user.full_name, email, reset_password.token, is_admin
        )

    def reset_password(self, serializer_data):
        """
        The common function to reset password.
        """

        # Verify and save a new password
        user = ResetPassword.verify(serializer_data["token"])
        if not user:
            raise ValidationError({"token": [ERROR_MESSAGES["token_invalid"]]})
        user.set_password(serializer_data["password"])
        user.save()

        # Remove used password reset token
        ResetPassword.objects.filter(user=user).delete()
