import os
import random
from datetime import datetime, timedelta

from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q
from django.utils.crypto import get_random_string
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import AccessToken

from base.apis import BaseAPIViewSet
from base.constants import (
    DEFAULT_TOKEN_SECONDS_EXPIRATION,
    ACCESS_TOKEN_LIFETIME,
    OTP_TOKEN_SECONDS_EXPIRATION,
    ACCESS_TOKEN_LIFETIME_REMEMBER,
)
from base.messages import ERROR_MESSAGES
from base.permissions import ActionPermission, IsOperationAdminOnly
from chat.constants import ChatRoomTypes, WebSocketEventType
from chat.models import ChatRoom
from common.serializers import EmptySerializer
from common.utils import (
    generate_file_name,
    get_username_alias,
    send_web_socket_event,
)
from companies.models import Company, Contract
from skills.models import SkillMapSkillLevel
from submit_levels.models import SubmitLevelHistory
from tasks.utils import _send_socket_show_popup_complete
from users.constants import (
    RoleTypes,
    StepsRegisterTypes,
    DEFAULT_OTP_ATTEMPTS,
    VerifyTokenTypes,
    LoginTypes,
)
from users.filters import AdminUserFilter, SystemUserFilter
from users.models import (
    LoginToken,
    Memo,
    Profile,
    ResetPassword,
    Role,
    User,
    UserVerification,
    DailyReport,
    ConfirmReport,
)
from users.serializers import (
    AdminLoginSerializer,
    AdminUserInviteSerializer,
    ChangePasswordSerializer,
    EmailVerificationSerializer,
    ForgotPasswordSerializer,
    MemoSerializer,
    OTPVerificationSerializer,
    ResendOTPSerializer,
    ResetPasswordSerializer,
    SystemLoginSerializer,
    SystemUserInviteSerializer,
    TokenVerificationSerializer,
    UserListSerializer,
    UserRegisterSerializer,
    UserSerializer,
    UserVerificationSerializer,
    SettingSerializer,
    DailyReportSerializer,
    UserLoginSerializer,
)
from utils.mail import MailService
from utils.jwt import JWTService
from common.filters import CustomOrderFilter
from roles.constants import Screens
from base.filters import FilterByPermission
from tasks.models import TeamTaskIndex


def _login(self, request, is_admin=True):
    """
    The common function to create login session.
    """

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer_data = serializer.validated_data

    if is_admin:
        user = User.objects.filter(
            email=serializer_data["email"],
            roles__name=RoleTypes.OPERATION_ADMIN.value,
        ).first()
    else:
        user = (
            User.objects.filter(
                Q(email=serializer_data["username"])
                | Q(username=serializer_data["username"])
            )
            .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
            .first()
        )

    user = authenticate(
        request,
        username_alias=user.username_alias if user else None,
        password=serializer_data["password"],
    )

    # Check role
    if not user:
        return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

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

        return self.response_ok(
            {
                "is_2fa": False,
                "access": str(token),
                "user": UserLoginSerializer(user).data,
            }
        )

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
    email_service.send_admin_login_otp(
        user.two_factor_auth_email, otp_code
    ) if is_admin else email_service.send_system_login_otp(
        str(user.profile), user.two_factor_auth_email, otp_code
    )
    user_verification.save()

    return self.response_ok({"is_2fa": True, "token": token})


def _resend_otp(self, token, is_admin=True):
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
    email_service.send_admin_login_otp(
        user.two_factor_auth_email, otp_code
    ) if is_admin else email_service.send_system_login_otp(
        str(user.profile), user.two_factor_auth_email, otp_code
    )
    user_verification.save()

    return self.response_ok({"is_2fa": True, "token": token})


def _verify_login(self, request, is_admin=True):
    """
    The common function to verify login session.
    """

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer_data = serializer.validated_data

    token = serializer_data["token"]
    otp_code = serializer_data["otp_code"]
    remember_me = serializer_data.get("remember_me", False)
    user_verification = UserVerification.objects.filter(token=token).last()
    JWTService.decode_token(token)  # Check if token is expired or not

    if user_verification is None:
        raise ValidationError(
            {"detail": [ERROR_MESSAGES["login_session_invalid"]]}
        )

    if not user_verification.otp_code == otp_code:
        raise ValidationError({"detail": [ERROR_MESSAGES["otp_code_invalid"]]})

    user = user_verification.user
    if (
        is_admin
        and user.check_roles(RoleTypes.OPERATION_ADMIN.value, exclude=True)
    ) or (not is_admin and user.check_roles(RoleTypes.OPERATION_ADMIN.value)):
        return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

    token = AccessToken.for_user(user)
    token_lifetime = (
        ACCESS_TOKEN_LIFETIME_REMEMBER if remember_me else ACCESS_TOKEN_LIFETIME
    )
    token.set_exp(lifetime=timedelta(minutes=token_lifetime))
    # Reset login session
    user_verification.token = None
    user_verification.otp_code = None
    user_verification.save()
    user.login_token(token)

    return self.response_ok(
        {
            "access": str(token),
            "user": UserLoginSerializer(user).data,
        }
    )


def _verify_token(self, request, is_admin=True):
    """
    The common function to check if token is valid.
    """

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer_data = serializer.validated_data
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
            raise ValidationError({"detail": [ERROR_MESSAGES["token_invalid"]]})
    else:
        # Decode token and retrieve User Verification data
        user_verification = UserVerification.objects.filter(token=token).first()
        if not user_verification:
            raise ValidationError({"detail": [ERROR_MESSAGES["token_invalid"]]})

        if user_verification.user is None:
            response_data = {
                "token": token,
                "steps": user_verification.steps,
            }

    return self.response_ok(response_data)


def _forgot_password(self, request, is_admin=True):
    """
    The common function to forgot password.
    """

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer_data = serializer.validated_data
    email = serializer_data["email"]

    if is_admin:
        user = User.objects.filter(
            email=email, roles__name=RoleTypes.OPERATION_ADMIN.value
        ).first()
    else:
        user = (
            User.objects.filter(email=email)
            .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
            .first()
        )

    if not user:
        raise ValidationError({"email": [ERROR_MESSAGES["email_invalid"]]})

    reset_password = ResetPassword.create(user=user)

    mail_service = MailService()
    mail_service.send_admin_forgot_password(
        email, reset_password.token
    ) if is_admin else mail_service.send_system_forgot_password(
        email, reset_password.token
    )
    return self.response_ok()


def _reset_password(self, request):
    """
    The common function to reset password.
    """

    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer_data = serializer.validated_data

    # Verify and save a new password
    user = ResetPassword.verify(serializer_data["token"])
    if not user:
        raise ValidationError({"token": [ERROR_MESSAGES["token_invalid"]]})
    user.set_password(serializer_data["password"])
    user.save()

    # Remove used password reset token
    ResetPassword.objects.filter(user=user).delete()
    return self.response_ok()


@extend_schema(tags=["System > Auth"])
class SystemAuthViewSet(BaseAPIViewSet):
    """
    API endpoint for authentication.
    """

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-email",
        serializer_class=EmailVerificationSerializer,
    )
    def verify_email(self, request):
        """
        Check if email is valid for registration.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        email = serializer_data["email"]

        # Create a new User Verification
        otp_code = str(random.randint(100000, 999999))
        otp_attempts = DEFAULT_OTP_ATTEMPTS
        steps = StepsRegisterTypes.VERIFY_EMAIL.value

        user_verification_serializer = UserVerificationSerializer(
            data={
                "otp_code": otp_code,
                "otp_attempts": otp_attempts,
                "steps": steps,
            }
        )
        user_verification_serializer.is_valid(raise_exception=True)
        user_verification_data = user_verification_serializer.data
        user_verification = UserVerification.objects.create(
            **user_verification_data
        )

        # Encode token and save to User Verification
        token = JWTService.encode_token(
            user_verification.id, email, DEFAULT_TOKEN_SECONDS_EXPIRATION
        )
        user_verification.token = token
        user_verification.save()

        # Send OTP code to user email
        email_service = MailService()
        email_service.send_register_otp(email, otp_code)

        return self.response_ok({"token": token})

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-token",
        serializer_class=TokenVerificationSerializer,
    )
    def verify_token(self, request):
        """
        Check if token is valid.
        """

        return _verify_token(self, request, is_admin=False)

    @action(
        methods=["POST"],
        detail=False,
        url_path="resend-otp",
        serializer_class=ResendOTPSerializer,
        permission_classes=[AllowAny],
    )
    def resend_otp(self, request):
        """
        Resend OTP when login for system.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        token = serializer_data.pop("token")

        # Handle resend OTP for system
        return _resend_otp(self, token=token, is_admin=False)

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-otp",
        serializer_class=OTPVerificationSerializer,
    )
    def verify_otp(self, request):
        """
        Check if otp is valid.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        token = serializer_data["token"]

        user_verification = UserVerification.objects.filter(token=token).first()
        if not user_verification:
            raise ValidationError({"detail": [ERROR_MESSAGES["token_invalid"]]})
        elif not user_verification.otp_code == serializer_data["otp_code"]:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["otp_code_invalid"]]}
            )

        user_verification.steps = StepsRegisterTypes.VERIFY_OTP.value
        user_verification.save()

        return self.response_ok({"token": token})

    @action(
        methods=["POST"],
        detail=False,
        url_path="register",
        serializer_class=UserRegisterSerializer,
    )
    @transaction.atomic()
    def register(self, request):
        """
        Register a new user.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        user = serializer_data.get("user", None)
        username_alias = get_username_alias(login_text=user.get("email", None))

        user_data = serializer_data.pop("user")
        token = serializer_data.pop("token")

        user_verification = UserVerification.objects.filter(token=token).last()

        if not user_verification or (
            user_verification
            and (user_verification.steps != StepsRegisterTypes.VERIFY_OTP.value)
        ):
            raise ValidationError({"detail": [ERROR_MESSAGES["token_invalid"]]})

        role = Role.get_role(RoleTypes.SYSTEM_ADMIN.value)
        user_data["two_factor_auth_email"] = user_data[
            "email"
        ]  # Default two_factor_auth_email is email when registration
        company_data = serializer_data.pop("company")

        company = Company.objects.create(**company_data)
        Contract.objects.create(company=company)
        user = User.objects.create(
            **user_data, company=company, username_alias=username_alias
        )

        # Set default role System Admin when register
        user.roles.add(role, through_defaults={"company": company})

        profile = Profile.objects.create(
            **serializer_data, user=user, company=company
        )

        user_verification.delete()  # Remove token used

        return self.response_created(data=self.get_serializer(profile).data)

    @action(
        methods=["POST"],
        detail=False,
        url_path="login",
        serializer_class=SystemLoginSerializer,
    )
    def login(self, request):
        """
        Login a user and return a session to verify the OTP.
        """

        return _login(self, request, is_admin=False)

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-2fa",
        serializer_class=SystemLoginSerializer,
    )
    def verify_2fa(self, request):
        """
        Verify 2FA when login.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data

        user = (
            User.objects.filter(
                Q(email=serializer_data["username"])
                | Q(username=serializer_data["username"])
            )
            .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
            .first()
        )

        user = authenticate(
            request,
            username_alias=user.username_alias if user else None,
            password=serializer_data["password"],
        )

        # Check authenticate
        if not user:
            return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

        if not user.is_two_factor_auth:
            return self.response_ok({"is_2fa": False})

        try:
            user_verification = user.user_verification
        except ObjectDoesNotExist:
            UserVerification.objects.create(user=user)
            user_verification = user.user_verification

        token = JWTService.encode_token(
            user.id, user.email, OTP_TOKEN_SECONDS_EXPIRATION
        )

        otp_code = str(random.randint(100000, 999999))
        user_verification.token = token
        user_verification.otp_code = otp_code
        user_verification.otp_attempts = DEFAULT_OTP_ATTEMPTS  # Reset counter

        # Send OTP code to user email
        MailService().send_system_login_otp(
            str(user.profile), user.two_factor_auth_email, otp_code
        )
        user_verification.save()

        return self.response_ok({"is_2fa": True, "token": token})

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-login",
        serializer_class=OTPVerificationSerializer,
    )
    def verify_login(self, request):
        """
        Verify a user's login.
        """

        return _verify_login(self, request, is_admin=False)

    @action(
        methods=["POST"],
        detail=False,
        url_path="forgot-password",
        serializer_class=ForgotPasswordSerializer,
    )
    def forgot_password(self, request):
        """
        Forgot password.
        """

        return _forgot_password(self, request, is_admin=False)

    @action(
        methods=["POST"],
        detail=False,
        url_path="reset-password",
        serializer_class=ResetPasswordSerializer,
    )
    def reset_password(self, request):
        """
        Reset password.
        """

        return _reset_password(self, request)

    @action(
        methods=["POST"],
        detail=False,
        url_path="change-password",
        serializer_class=ChangePasswordSerializer,
        permission_classes=[IsAuthenticated],
    )
    def change_password(self, request):
        """
        Change password.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data

        # Update new password
        user = request.user
        user.set_password(serializer_data["new_password"])
        user.save()

        return self.response_ok()

    @action(
        detail=False,
        methods=["GET"],
        url_path="me",
        serializer_class=UserSerializer,
        permission_classes=[IsAuthenticated],
    )
    def get_user_profile(self, request):
        """
        Get profile of user logged
        """
        return self.response_ok(self.get_serializer(request.user).data)


@extend_schema(tags=["Admin > Auth"])
class AdminAuthViewSet(BaseAPIViewSet):
    """
    API endpoint for authentication.
    """

    @action(
        methods=["POST"],
        detail=False,
        url_path="login",
        serializer_class=AdminLoginSerializer,
    )
    def login(self, request):
        """
        Login an admin and return a session to verify the OTP.
        """

        return _login(self, request, is_admin=True)

    @action(
        methods=["POST"],
        detail=False,
        url_path="resend-otp",
        serializer_class=ResendOTPSerializer,
        permission_classes=[AllowAny],
    )
    def resend_otp(self, request):
        """
        Resend OTP when login for admin.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        token = serializer_data.pop("token")

        # Handle resend OTP for admin
        return _resend_otp(self, token=token, is_admin=True)

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-login",
        serializer_class=OTPVerificationSerializer,
    )
    def verify_login(self, request):
        """
        Verify an admin login.
        """

        return _verify_login(self, request, is_admin=True)

    @action(
        methods=["POST"],
        detail=False,
        url_path="verify-token",
        serializer_class=TokenVerificationSerializer,
    )
    def verify_token(self, request):
        """
        Check if token is valid.
        """

        return _verify_token(self, request)

    @action(
        methods=["POST"],
        detail=False,
        url_path="forgot-password",
        serializer_class=ForgotPasswordSerializer,
    )
    def forgot_password(self, request):
        """
        Forgot password.
        """

        return _forgot_password(self, request)

    @action(
        methods=["POST"],
        detail=False,
        url_path="reset-password",
        serializer_class=ResetPasswordSerializer,
    )
    def reset_password(self, request):
        """
        Reset password.
        """

        return _reset_password(self, request)


@extend_schema(tags=["System > Users"])
class SystemUserViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint that allows performed CRUD operations on users.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [ActionPermission]
    filter_backends = [
        FilterByPermission,
        DjangoFilterBackend,
        CustomOrderFilter,
    ]
    ordering_fields = {
        "id": "id",
        "email": "email",
        "full_name": "profile__full_name",
        "company_name": "company__name",
        "role": "roles__name",
    }
    filterset_class = SystemUserFilter
    screen_name = Screens.USER.value

    def get_queryset(self):
        """
        Filtering users by company.
        """

        user = self.request.user
        company = user.company

        queryset = (
            super()
            .get_queryset()
            .filter(company=company)
            .exclude(roles__name=RoleTypes.OPERATION_ADMIN.value)
            .distinct()
        )
        return queryset.order_by("created_at")

    def get_serializer_class(self):
        """
        Return the serializer class to use.
        """
        if self.action in ["chat_setting"]:
            return EmptySerializer

        if self.action in ["setting"]:
            return SettingSerializer

        if self.action in ["report"]:
            return DailyReportSerializer

        if self.action == "list":
            return UserListSerializer

        return (
            SystemUserInviteSerializer
            if self.action in ["create", "update", "partial_update"]
            else UserSerializer
        )

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Perform create a user.
        """

        serializer_data = serializer.validated_data
        email = serializer_data.get("email", None)
        username = serializer_data.get("username", None)
        username_alias = get_username_alias(login_text=email or username)

        profile_data = serializer_data.pop("profile")
        organizations_data = serializer_data.pop("organization_ids")
        roles_data = serializer_data.pop("roles")

        # Make sure using email or username only
        if (
            serializer_data.get("login_type") == LoginTypes.EMAIL.value
            and not serializer_data.get("email")
        ) or (
            serializer_data.get("login_type") == LoginTypes.USERNAME.value
            and not serializer_data.get("username")
        ):
            raise ValidationError(
                {"login_type": [ERROR_MESSAGES["login_type_does_not_match"]]}
            )
        serializer_data.pop("username", None) if serializer_data.get(
            "login_type"
        ) == LoginTypes.EMAIL.value else serializer_data.pop("email", None)

        # Save data to User and Profile
        company = self.request.user.company
        password = get_random_string(8)
        user = serializer.save(
            company=company, password=password, username_alias=username_alias
        )
        Profile.objects.create(user=user, company=company, **profile_data)

        # Save data to Users Organizations
        for org in organizations_data:
            user.organizations.add(
                org.get("organization"),
                through_defaults={
                    "company": company,
                    "is_main": org.get("is_main", False),
                },
            )

        # Save data to Users Organizations
        for role in roles_data:
            user.roles.add(role, through_defaults={"company": company})

        # Send mail to invited user
        mail_service = MailService()
        mail_service.send_system_invite_user_by_email(
            user.email, password, company
        ) if serializer_data.get(
            "login_type"
        ) == LoginTypes.EMAIL.value else mail_service.send_system_invite_user_by_id(
            self.request.user.email,
            serializer_data.get("username"),
            password,
            company,
        )

    @transaction.atomic()
    def perform_update(self, serializer):
        """
        Perform update a user.
        """
        instance = serializer.instance
        serializer_data = serializer.validated_data
        profile_data = serializer_data.pop("profile", None)
        password = serializer_data.pop("password", None)
        roles_data = serializer_data.pop("roles", None)
        organizations_data = serializer_data.pop("organization_ids", None)

        # Remove all data from serialized data to not save in DB
        keys_to_remove = ["email", "username", "login_type"]
        for key in keys_to_remove:
            serializer_data.pop(key, None)

        # Check if user is the last system admin and change role
        system_admin_of_company_count = User.objects.filter(
            company=instance.company, roles__name=RoleTypes.SYSTEM_ADMIN.value
        ).count()
        if (
            roles_data is not None
            and RoleTypes.SYSTEM_ADMIN.value
            not in [role.name for role in roles_data]
            and instance.check_roles(RoleTypes.SYSTEM_ADMIN.value)
            and system_admin_of_company_count <= 1
        ):
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["last_system_admin_role_change"]]}
            )

        # Block logged in users when their role is changed.
        if roles_data is not None:
            # Get the list of role IDs for comparison
            existing_role_ids = list(
                instance.roles.values_list("id", flat=True)
            )
            new_role_ids = [role.id for role in roles_data]

            # Compare roles (ignoring order)
            if sorted(existing_role_ids) != sorted(new_role_ids):
                LoginToken.objects.filter(user=instance).update(is_block=True)
                # Check difference of current roles and new roles, if change send socket for logout
                send_web_socket_event(
                    {
                        "is_change_role": True,
                        "action": WebSocketEventType.CHANGE_ROLE.value,
                    },
                    user=instance,
                )

        # Update avatar user
        if avatar := serializer_data.get("avatar", None):
            # Remove old avatar
            instance.avatar.delete()

            # Gen new file name
            file_name = avatar.name
            avatar.name = generate_file_name(file_name)

        # Update data to User and Profile
        user = serializer.save()
        if profile_data is not None:
            user.set_profile(profile_data)
        if password:
            user.set_password(password)
            user.save()

        if organizations_data is not None:
            # Update data to Users Organizations
            current_organization = [
                organization for organization in user.organizations.all()
            ]
            new_organization = [
                org.get("organization") for org in organizations_data
            ]
            if delete_organizations := list(
                set(current_organization) - set(new_organization)
            ):
                for delete_org in delete_organizations:
                    skill_maps = user.skill_maps.filter(organization=delete_org)
                    skills = skill_maps.values("skill")
                    # Remove all submit level in organization of user
                    SubmitLevelHistory.objects.filter(
                        organization=delete_org, staff=user, skill__in=skills
                    ).delete()
                    # Remove all skill map in organization of user
                    skill_maps.delete()

                # Remove team task index
                TeamTaskIndex.objects.filter(
                    user=instance, team__in=delete_organizations
                ).all().delete()

            user.organizations.clear()
            for data_org in organizations_data:
                user.organizations.add(
                    data_org.get("organization"),
                    through_defaults={
                        "company": user.company,
                        "is_main": data_org.get("is_main", False),
                    },
                )

        if roles_data is not None:
            user.roles.clear()
            for role in roles_data:
                user.roles.add(
                    role,
                    through_defaults={"company": user.company},
                )

    @transaction.atomic()
    def perform_destroy(self, instance):
        """
        Perform destroy a user.
        """
        # Cannot delete itself
        if instance.id == self.request.user.id:
            raise PermissionDenied

        company = instance.company
        system_admin_of_company_count = User.objects.filter(
            company=company, roles__name=RoleTypes.SYSTEM_ADMIN.value
        ).count()
        if (
            instance.check_roles(RoleTypes.SYSTEM_ADMIN.value)
            and system_admin_of_company_count <= 1
        ):
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["last_system_admin_deleted"]]}
            )
        ChatRoom.objects.filter(
            chat_rooms_participants__user=instance,
            type__in=[
                ChatRoomTypes.PRIVATE.value,
                ChatRoomTypes.TASK.value,
                ChatRoomTypes.SELF.value,
            ],
        ).delete()
        # Send socket for logout user deleted
        send_web_socket_event(
            {
                "is_change_role": True,
                "action": WebSocketEventType.CHANGE_ROLE.value,
            },
            user=instance,
        )

        if instance.avatar:
            # Remove old avatar
            instance.avatar.delete()

        instance.delete()

    @action(
        detail=False,
        methods=["POST"],
        url_path="setting",
        permission_classes=[IsAuthenticated],
    )
    def setting(self, request):
        """
        Handle store setting of user
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        user = request.user
        user.set_setting(serializer_data)
        user.save()

        return self.response_ok()

    @action(
        detail=True,
        methods=["POST"],
        url_path="report",
        serializer_class=DailyReportSerializer,
    )
    @transaction.atomic()
    def report(self, request, pk):
        user = self.get_object()
        request_user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        date = serializer_data.get("date")
        is_confirmed = serializer_data.pop("is_confirmed", None)

        while DailyReport.objects.filter(user=user, date=date).count() > 1:
            DailyReport.objects.filter(user=user, date=date).first().delete()
        if is_confirmed is not None:
            ConfirmReport.objects.update_or_create(
                date=date,
                confirm_by=request_user,
                user=user,
                defaults={"is_confirmed": is_confirmed},
            )
            return self.response_ok()
        else:
            daily, created = DailyReport.objects.update_or_create(
                user=user,
                date=date,
                defaults=serializer.validated_data,
            )

            return self.response_ok(self.get_serializer(daily).data)


@extend_schema(tags=["System > Users"])
class SystemUserMemoViewSet(BaseAPIViewSet):
    """
    API endpoint for User memo.
    """

    queryset = Memo.objects.all()
    serializer_class = MemoSerializer
    permission_classes = [IsAuthenticated]
    screen_name = Screens.USER.value

    def get_queryset(self):
        """
        Filtering memos by company.
        """

        user = self.request.user
        return super().get_queryset().filter(user=user, company=user.company)

    @action(
        detail=False,
        methods=["GET", "POST"],
        url_path="memo",
    )
    def memo(self, request):
        """
        Retrieve, create or update memo the logged-in user.
        """
        # Retrieve the memo of the logged-in user.
        if request.method == "GET":
            user = request.user
            # Send websocket when completed progress lookback skill map

            skill_map_levels = SkillMapSkillLevel.objects.filter(
                next_submit_at__lte=datetime.now(),
                skill_map__staff=user,
                popup=True,
            ).all()
            for skill_map_level in skill_map_levels:
                _send_socket_show_popup_complete(
                    skill_map_level.skill_map, None, None, user, skill_map_level
                )

            return self.response_ok(
                self.get_serializer(
                    user.memo if hasattr(user, "memo") else None
                ).data
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update or create memo for the current user
        memo, created = Memo.objects.update_or_create(
            user=request.user,
            defaults={
                "content": serializer.validated_data["content"],
                "is_open": serializer.validated_data["is_open"],
            },
        )

        return self.response_ok(self.get_serializer(memo).data)

    @action(
        detail=False,
        methods=["POST"],
        url_path="daily-report",
        permission_classes=[ActionPermission],
        serializer_class=DailyReportSerializer,
        screen_name=Screens.STATISTIC.value,
    )
    @transaction.atomic()
    def daily_report(self, request):
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if (
            DailyReport.objects.filter(
                user=user, date=serializer.validated_data["date"]
            ).count()
            > 1
        ):
            DailyReport.objects.filter(
                user=user, date=serializer.validated_data["date"]
            ).first().delete()

        daily, created = DailyReport.objects.update_or_create(
            user=user,
            date=serializer.validated_data["date"],
            defaults=serializer.validated_data,
        )

        return self.response_ok(self.get_serializer(daily).data)


@extend_schema(tags=["Admin > Users"])
class AdminUserViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint that allows performed CRUD operations on users admin.
    """

    queryset = User.objects.all()
    serializer_class = AdminUserInviteSerializer
    permission_classes = [IsOperationAdminOnly]
    filter_backends = [
        DjangoFilterBackend,
        CustomOrderFilter,
    ]
    ordering_fields = {
        "id": "id",
        "email": "email",
        "full_name": "profile__full_name",
    }
    filterset_class = AdminUserFilter

    def get_queryset(self):
        """
        Filtering users by company.
        """

        queryset = (
            super()
            .get_queryset()
            .filter(roles__name=RoleTypes.OPERATION_ADMIN.value)
            .distinct()
        )
        return queryset.order_by("created_at")

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Perform create a user.
        """

        serializer_data = serializer.validated_data

        username_alias = get_username_alias(
            login_text=serializer_data.get("email", None),
            is_operation_admin=True,
        )
        profile_data = serializer_data.pop("profile")

        # Save data to User and Profile
        company = self.request.user.company
        password = get_random_string(8)
        role = Role.get_role(RoleTypes.OPERATION_ADMIN.value)
        user = serializer.save(
            company=company,
            password=password,
            username_alias=username_alias,
        )
        Profile.objects.create(user=user, company=company, **profile_data)

        # Set role Operation Admin
        user.roles.add(role, through_defaults={"company": user.company})

        # Send mail to invited user
        mail_service = MailService()
        mail_service.send_admin_invite_user(user.email, password, user)

    @transaction.atomic()
    def perform_update(self, serializer):
        """
        Perform update a user.
        """

        serializer_data = serializer.validated_data
        profile_data = serializer_data.pop("profile")
        serializer_data.pop("email", None)

        # Update data to User and Profile
        user = serializer.save()
        user.set_profile(profile_data)
