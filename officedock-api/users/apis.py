import random
from datetime import datetime

from dateutil.relativedelta import relativedelta
from django.contrib.auth import authenticate
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q
from django.utils.crypto import get_random_string
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny

from base.apis import BaseAPIViewSet
from base.constants import (
    DEFAULT_TOKEN_SECONDS_EXPIRATION,
    OTP_TOKEN_SECONDS_EXPIRATION,
)
from base.messages import ERROR_MESSAGES
from base.permissions import ActionPermission, IsOperationAdminOnly
from chat.constants import ChatRoomTypes, WebSocketEventType
from chat.models import ChatRoom
from common.serializers import EmptySerializer
from common.utils import (
    calculate_company_dates,
    generate_file_name,
    get_client_ip,
    get_user_agent,
    get_username_alias,
    send_web_socket_event,
)
from companies.models import Company, Contract
from companies.services import CompanyService
from plans.models import Plan
from submit_levels.models import SubmitLevelHistory
from users.constants import (
    RoleTypes,
    StepsRegisterTypes,
    DEFAULT_OTP_ATTEMPTS,
    LoginTypes,
    CurrencyEnums,
    TransactionTypes,
)
from users.filters import AdminUserFilter, SystemUserFilter
from users.models import (
    LoginToken,
    Memo,
    Profile,
    Role,
    User,
    UserActivityLog,
    UserVerification,
    DailyReport,
    ConfirmReport,
    TransactionHistory,
    LoginBonus,
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
    TransactionManagementSerializer,
    UserListSerializer,
    UserRegisterSerializer,
    UserSerializer,
    UserVerificationSerializer,
    SettingSerializer,
    DailyReportSerializer,
    TransactionHistorySerializer,
)
from users.services.user_balance_service import UserService
from utils.mail import MailService, PaymentMailService
from utils.jwt import JWTService
from common.filters import CustomOrderFilter
from roles.constants import Screens
from base.filters import FilterByPermission
from tasks.models import TeamTaskIndex
from base.paginations import CustomCursorPagination
from users.services.auth_service import UserAuthService

"""
Viewsets group for Admin
"""


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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().login(
            request, serializer_data, is_admin=True
        )

        if not result:
            return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

        return self.response_ok(result)

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
        result = UserAuthService().resend_otp(token, is_admin=True)
        return self.response_ok(result)

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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().verify_login(serializer_data, is_admin=True)

        if not result:
            return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

        return self.response_ok(result)

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().verify_token(serializer_data)
        return self.response_ok(result)

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        UserAuthService().forgot_password(serializer_data)
        return self.response_ok()

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UserAuthService().reset_password(serializer.validated_data)
        return self.response_ok()


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
        company_id = self.request.user.company_id
        password = get_random_string(8)
        role = Role.get_role(RoleTypes.OPERATION_ADMIN.value)
        user = serializer.save(
            company_id=company_id,
            password=password,
            username_alias=username_alias,
        )
        Profile.objects.create(user=user, company_id=company_id, **profile_data)

        # Set role Operation Admin
        user.roles.add(role, through_defaults={"company_id": user.company_id})

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

    def perform_destroy(self, instance):
        """
        Perform destroy a user.
        """
        if self.request.user.id == instance.id:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["cannot_delete_yourself"]]}
            )

        if (
            User.objects.filter(
                roles__name=RoleTypes.OPERATION_ADMIN.value
            ).count()
            <= 1
        ):
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["last_operation_admin_deleted"]]}
            )

        instance.delete()


"""
Viewsets group for System
"""


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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().verify_token(serializer_data, is_admin=False)
        return self.response_ok(result)

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
        result = UserAuthService().resend_otp(token, is_admin=False)
        return self.response_ok(result)

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
        elif user_verification.otp_code != serializer_data["otp_code"]:
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

        # Set default calendar organization
        calendar_org = company.get_calendar_organization()
        user.organizations.add(
            calendar_org,
            through_defaults={
                "company": company,
                "is_main": False,
            },
        )

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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().login(
            request, serializer_data, is_admin=False
        )

        if not result:
            return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

        return self.response_ok(result)

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
        if not user or not UserService().check_valid_company(user):
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

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        result = UserAuthService().verify_login(serializer_data, is_admin=False)

        if not result:
            return self.response(status_code=status.HTTP_401_UNAUTHORIZED)

        return self.response_ok(result)

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        UserAuthService().forgot_password(serializer_data, is_admin=False)
        return self.response_ok()

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
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UserAuthService().reset_password(serializer.validated_data)
        return self.response_ok()

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
        serializer_class=UserListSerializer,
        permission_classes=[IsAuthenticated],
    )
    def get_user_profile(self, request):
        """
        Get profile of user logged
        """
        return self.response_ok(self.get_serializer(request.user).data)

    @action(
        detail=False,
        methods=["GET"],
        url_path="login-bonus",
        permission_classes=[IsAuthenticated],
    )
    def login_bonus(self, request):
        """
        Daily login bonus pearl
        """
        today = datetime.now().date()

        if not LoginBonus.objects.filter(
            created_at__date=today, user=request.user
        ).exists():
            LoginBonus.objects.create(
                user=request.user,
                company_id=request.user.company_id,
            )
        return self.response_ok()


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
        company_id = user.company_id

        queryset = (
            super()
            .get_queryset()
            .filter(company_id=company_id)
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
        current_user = self.request.user
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
        company = current_user.company
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

        # Save calendar organization
        calendar_org = company.get_calendar_organization()
        user.organizations.add(
            calendar_org,
            through_defaults={
                "company": company,
                "is_main": False,
            },
        )

        # Add roles to user role
        for role in roles_data:
            user.roles.add(role, through_defaults={"company": company})

        # Send mail to invited user
        new_user_email = ""
        mail_service = MailService()
        payment_mail_service = PaymentMailService()
        if serializer_data.get("login_type") == LoginTypes.EMAIL.value:
            new_user_email = user.email
            mail_service.send_system_invite_user_by_email(
                user.email, password, company
            )
        else:
            new_user_email = serializer_data.get("username")
            mail_service.send_system_invite_user_by_id(
                self.request.user.email,
                new_user_email,
                password,
                company,
            )

        # Send mail to responsible
        if hasattr(company, "responsible_person_mail"):
            payment_mail_service.send_account_added(
                recipient=company.responsible_person_mail,
                company_name=company.name,
                responsible_name=getattr(
                    company, "responsible_person_name", ""
                ),
                new_user_name=user.full_name,
                new_user_email=new_user_email,
            )

        # Handle check max user
        company_user_count = company.users.count()
        current_plan = company.company_plan.plan
        if company_user_count > company.max_user_in_contract_period:
            company.max_user_in_contract_period = company_user_count
            company.max_user_at = datetime.now()
            company.save(
                update_fields=["max_user_in_contract_period", "max_user_at"]
            )
        if company_user_count > current_plan.limit_person:
            filter = Q()
            if company_user_count <= 10:
                filter = Q(limit_person=10)
            elif company_user_count <= 20:
                filter = Q(limit_person=20)
            else:
                filter = Q(limit_person=30)
            plan = Plan.objects.filter(filter).first()
            if plan != current_plan:
                CompanyService().upgrade_plan(company, plan)

        # Log user create
        UserActivityLog.log_user_creation(
            user,
            current_user,
            get_client_ip(self.request),
            get_user_agent(self.request),
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
                LoginToken.objects.filter(user=instance).delete()
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
                        "company_id": user.company_id,
                        "is_main": data_org.get("is_main", False),
                    },
                )

        if roles_data is not None:
            user.roles.clear()
            for role in roles_data:
                user.roles.add(
                    role,
                    through_defaults={"company_id": user.company_id},
                )

    @transaction.atomic()
    def perform_destroy(self, instance):
        """
        Perform destroy a user.
        """
        current_user = self.request.user

        # Cannot delete itself
        if instance.id == current_user.id:
            raise ValidationError(
                {"detail": [ERROR_MESSAGES["cannot_delete_yourself"]]}
            )

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
        # Block access token for logged user
        LoginToken.objects.filter(user=instance).delete()
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

        # Log user create
        UserActivityLog.log_user_deletion(
            instance,
            current_user,
            get_client_ip(self.request),
            get_user_agent(self.request),
        )

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

    @action(
        methods=["GET"],
        detail=False,
        url_path="current-point",
        permission_classes=[IsAuthenticated],
    )
    def get_current_point(self, request):
        """
        Get current point of user
        """
        return self.response_ok(
            {
                "coin": request.user.coin,
                "pearl": request.user.pearl,
                "exchangeable_coin": request.user.exchangeable_coin,
            }
        )


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
        return (
            super().get_queryset().filter(user=user, company_id=user.company_id)
        )

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


@extend_schema(tags=["System > Point History"])
class SystemPointHistoryViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for point history for user.
    """

    queryset = TransactionHistory.objects.order_by("-created_at")
    serializer_class = TransactionHistorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomCursorPagination
    ordering = "-created_at"

    def get_queryset(self):
        """
        Filtering memos by company.
        """

        user = self.request.user
        queryset = (
            super().get_queryset().filter(user=user, company_id=user.company_id)
        )

        type_param = self.request.query_params.get("type")
        if type_param:
            queryset = queryset.filter(currency=type_param.upper())

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "type", type=str, enum=CurrencyEnums.values(), required=False
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


@extend_schema(tags=["System > Point Management"])
class SystemPointManagementViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for point management for user admin.
    """

    queryset = TransactionHistory.objects.order_by("-id")
    serializer_class = TransactionManagementSerializer
    permission_classes = [ActionPermission]
    pagination_class = CustomCursorPagination
    ordering = "-id"
    screen_name = Screens.POINT_MANAGEMENT.value

    def get_queryset(self):
        """
        Filtering memos by company.
        """

        user = self.request.user
        queryset = (
            super()
            .get_queryset()
            .filter(
                currency=CurrencyEnums.COIN.value,
                company_id=user.company_id,
                transaction_type__in=[
                    TransactionTypes.PLAN_AUTO.value,
                    TransactionTypes.PLAN_AUTO_EXPIRE.value,
                    TransactionTypes.EXCHANGE.value,
                ],
            )
        )

        return queryset

    @action(
        methods=["GET"],
        detail=False,
        url_path="coins-status",
    )
    def get_current_coins_status(self, request):
        """
        Return current coin status for the company, including issue and expiration dates.
        """
        user = request.user
        company = user.company
        today = datetime.now().date()

        # Calculate key company-related dates
        company_dates = calculate_company_dates(company, today)
        date_after_closing = company_dates["date_after_closing"]

        return self.response_ok(
            {
                "total_coins": company.total_coins,
                "target_user_count": company.target_user_count,
                "exchangeable_coins_per_user": company.total_coins,
                "issue_date": date_after_closing,
                "expiration_date": date_after_closing + relativedelta(months=1),
            }
        )
