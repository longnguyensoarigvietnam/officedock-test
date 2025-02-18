from django.contrib.auth import password_validation, authenticate
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from base.messages import ERROR_MESSAGES
from calendars.constants import CalendarTypes
from companies.serializers import CompanySerializer
from organizations.models import UsersOrganizations, Organization
from organizations.serializers import (
    OrganizationSerializer,
    OrganizationsForCreationSerializer,
)
from roles.constants import Actions, Screens, SelectionResultOptions
from roles.utils import has_permission
from terms.constants import TermTypes, TermStatus
from terms.models import Term
from users.models import (
    Memo,
    Profile,
    Role,
    User,
    UserVerification,
    Setting,
    DailyReport,
)
from users.constants import RoleTypes


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the Profile model.
    """

    class Meta:
        model = Profile
        fields = ["id", "full_name", "birthday", "gender"]


class BaseUserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    """

    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "two_factor_auth_email",
            "password",
            "profile",
            "login_type",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "login_type": {"read_only": True},
        }

    def validate_password(self, value):
        """
        Validate user password
        """

        password_validation.validate_password(value, self.instance)
        return value

    def validate_email(self, value):
        """
        Validate unique email for System site.
        """
        User.validate_unique_email(
            instance=self.instance, email=value, is_admin_site=False
        )
        return super().validate(value)

    def validate_username(self, value):
        """
        Validate unique username for System site.
        """
        User.validate_unique_username(
            instance=self.instance, username=value, is_admin_site=False
        )
        return super().validate(value)


class LoginTokenResponseSerializer(TokenObtainPairSerializer):
    """
    Custom Token Obtain Pair Serializer to include user profile data.
    """

    refresh = serializers.CharField(read_only=True)
    access = serializers.CharField(read_only=True)
    user = BaseUserSerializer(read_only=True)

    class Meta:
        fields = [
            "refresh",
            "access",
            "user",
        ]
        read_only_fields = ["refresh", "access", "user"]


class SystemLoginSerializer(serializers.Serializer):
    """
    Serializer for login form.
    """

    username = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, max_length=255)
    remember_me = serializers.BooleanField(
        default=False, required=False, allow_null=True
    )


class AdminLoginSerializer(serializers.Serializer):
    """
    Serializer for login form.
    """

    email = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True, max_length=255)
    remember_me = serializers.BooleanField(
        default=False, required=False, allow_null=True
    )


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for the Verify Email form.
    """

    email = serializers.EmailField()

    def validate_email(self, value):
        """
        Validate unique email for System site.
        """
        User.validate_unique_email(
            instance=self.instance, email=value, is_admin_site=False
        )
        return value


class TokenVerificationSerializer(serializers.Serializer):
    """
    Serializer for the Verify Token form.
    """

    token = serializers.CharField(max_length=255)
    verify_type = serializers.CharField(required=False)


class OTPVerificationSerializer(serializers.Serializer):
    """
    Serializer for the Verify OTP form.
    """

    token = serializers.CharField(max_length=255)
    otp_code = serializers.CharField(max_length=6)
    remember_me = serializers.BooleanField(
        default=False, required=False, allow_null=True
    )


class ResendOTPSerializer(serializers.Serializer):
    """
    Serializer for resend OTP.
    """

    token = serializers.CharField(max_length=255)


class UserVerificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the UserVerification model.
    """

    class Meta:
        model = UserVerification
        fields = ["id", "token", "otp_code", "otp_attempts", "steps"]


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model.
    """

    class Meta:
        model = Role
        fields = ["id", "name", "system_role"]


class SettingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model.
    """

    class Meta:
        model = Setting
        fields = [
            "is_check_self_task",
            "is_check_self_schedule",
            "is_check_company_schedule",
            "is_enter_send_message",
            "is_sorting_task_by_deadline",
            "is_sorting_task_by_important",
        ]


class OrganizationForUserSerializer(OrganizationSerializer):
    """
    Serializer for the Organization without action.
    """

    is_main = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "is_main",
        ]

    def get_is_main(self, obj):
        """
        Get the is_main value from UsersOrganizations.
        """
        user = self.context.get("user")
        users_org = UsersOrganizations.objects.filter(
            user=user, organization=obj
        ).first()
        return users_org.is_main if users_org else False


class OrganizationForUserLoginSerializer(OrganizationSerializer):
    """
    Serializer for the Organization without action.
    """

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "superior",
            "superior_id",
            "user_count",
        ]


class UserSerializer(BaseUserSerializer):
    """
    Serializer for the User model.
    """

    profile = ProfileSerializer()
    company = CompanySerializer(read_only=True)
    organizations = serializers.SerializerMethodField(read_only=True)
    roles = RoleSerializer(read_only=True, many=True)
    setting = SettingSerializer(read_only=True)
    unread_terms = serializers.SerializerMethodField(read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)
    current_event = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_two_factor_auth",
            "two_factor_auth_email",
            "roles",
            "permissions",
            "profile",
            "company",
            "organizations",
            "login_type",
            "setting",
            "unread_terms",
            "current_event",
        ]

    def get_permissions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        permissions = set()
        for role in obj.roles.all():
            perms = role.permissions.exclude(
                Q(
                    role_details__selection_result=SelectionResultOptions.NOT_ALLOWED.value
                )
                | Q(role_details__selection_result__isnull=True)
            ).values_list("name", flat=True)
            permissions.update(perms)

        return list(permissions)

    def get_organizations(self, obj):
        """
        Get sorted organizations
        """
        sorted_orgs = [
            item.organization
            for item in UsersOrganizations.objects.filter(user=obj).order_by(
                "-is_main"
            )
        ]
        return OrganizationForUserSerializer(
            sorted_orgs, many=True, context={"user": obj}
        ).data

    def get_unread_terms(self, instance):
        """
        Get unread term of user
        """
        if instance.check_roles(RoleTypes.OPERATION_ADMIN.value):
            return []
        else:
            today = timezone.now().date()
            term_of_use = Term.objects.filter(
                Q(type=TermTypes.TERM_OF_USE.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            privacy_policy = Term.objects.filter(
                Q(type=TermTypes.PRIVACY_POLICY.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            data = []
            if (
                term_of_use
                and not instance.read_terms.filter(term=term_of_use).exists()
            ):
                data.append({"id": term_of_use.id})
            if (
                privacy_policy
                and not instance.read_terms.filter(term=privacy_policy).exists()
            ):
                data.append({"id": privacy_policy.id})

            return data

    def get_current_event(self, obj):
        """Get current event starting"""
        event = (
            obj.tasks.filter(is_start=True).first()
            or obj.schedules.filter(is_start=True).first()
        )

        if event:
            event_type = (
                CalendarTypes.TASK.value
                if event in obj.tasks.all()
                else CalendarTypes.SCHEDULE.value
            )
            return {
                "type": event_type,
                "id": event.id,
                "title": event.title,
            }

        return None


class UserLoginSerializer(BaseUserSerializer):
    """
    Serializer for the User model.
    """

    profile = ProfileSerializer()
    company = CompanySerializer(read_only=True)
    organizations = serializers.SerializerMethodField(read_only=True)
    roles = RoleSerializer(read_only=True, many=True)
    setting = SettingSerializer(read_only=True)
    unread_terms = serializers.SerializerMethodField(read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_two_factor_auth",
            "two_factor_auth_email",
            "roles",
            "permissions",
            "profile",
            "company",
            "organizations",
            "login_type",
            "setting",
            "unread_terms",
        ]

    def get_permissions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        permissions = set()
        for role in obj.roles.all():
            perms = role.permissions.exclude(
                Q(
                    role_details__selection_result=SelectionResultOptions.NOT_ALLOWED.value
                )
                | Q(role_details__selection_result__isnull=True)
            ).values_list("name", flat=True)
            permissions.update(perms)

        return list(permissions)

    def get_organizations(self, obj):
        """
        Get sorted organizations
        """
        sorted_orgs = [
            item.organization
            for item in UsersOrganizations.objects.filter(user=obj).order_by(
                "id"
            )
        ]
        return OrganizationForUserLoginSerializer(
            sorted_orgs, many=True, context={"user": obj}
        ).data

    def get_unread_terms(self, instance):
        """
        Get unread term of user
        """
        if instance.check_roles(RoleTypes.OPERATION_ADMIN.value):
            return []
        else:
            today = timezone.now().date()
            term_of_use = Term.objects.filter(
                Q(type=TermTypes.TERM_OF_USE.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            privacy_policy = Term.objects.filter(
                Q(type=TermTypes.PRIVACY_POLICY.value)
                & Q(status=TermStatus.PUBLIC.value)
                & Q(period_start__lte=today)
                & Q(Q(period_end__gte=today) | Q(period_end__isnull=True))
            ).first()
            data = []
            if (
                term_of_use
                and not instance.read_terms.filter(term=term_of_use).exists()
            ):
                data.append({"id": term_of_use.id})
            if (
                privacy_policy
                and not instance.read_terms.filter(term=privacy_policy).exists()
            ):
                data.append({"id": privacy_policy.id})

            return data


class UserListSerializer(UserSerializer):
    """
    Serializer for list user.
    """

    actions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "roles",
            "profile",
            "company",
            "organizations",
            "actions",
            "email",
        ]

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        user = self.context.get("request").user

        actions = {
            Actions.UPDATE.value: f"{Screens.USER.value}_{Actions.UPDATE.value}",
            Actions.DELETE.value: f"{Screens.USER.value}_{Actions.DELETE.value}",
        }
        item_org_ids = obj.organizations.values_list("id", flat=True)

        permissions = has_permission(actions, user, item_org_ids)
        # Check not show button delete if itself
        if user.id == obj.id:
            permissions[Actions.DELETE.value] = False

        return permissions


class UserRegisterSerializer(ProfileSerializer):
    """
    Serializer for the User registration form.
    """

    token = serializers.CharField(max_length=255, write_only=True)
    user = BaseUserSerializer()
    company = CompanySerializer()

    class Meta(ProfileSerializer.Meta):
        fields = ProfileSerializer.Meta.fields + ["token", "user", "company"]
        write_only_fields = ["token"]


class SystemUserInviteSerializer(serializers.ModelSerializer):
    """
    Serializer for the User organization create form.
    """

    profile = ProfileSerializer()
    roles = RoleSerializer(read_only=True, many=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        source="roles",
        queryset=Role.objects.all(),
        write_only=True,
        many=True,
        required=False,
        allow_null=False,
    )
    company = CompanySerializer(read_only=True)
    organizations = OrganizationSerializer(many=True, read_only=True)
    organization_ids = OrganizationsForCreationSerializer(
        many=True, write_only=True
    )
    password = serializers.CharField(
        write_only=True, allow_null=True, max_length=255
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "profile",
            "roles",
            "role_ids",
            "company",
            "organizations",
            "organization_ids",
            "login_type",
            "is_two_factor_auth",
            "two_factor_auth_email",
        ]

    def validate_role_id(self, value):
        """
        Not allow select role in Admin.
        """

        if value.name == RoleTypes.OPERATION_ADMIN.value:
            raise ValidationError(ERROR_MESSAGES["role_not_exist"])
        return super().validate(value)

    def validate_password(self, value):
        """
        Validate user password
        """
        if value:
            password_validation.validate_password(value, self.instance)
        return value

    def validate_email(self, value):
        """
        Validate unique email for System site.
        """
        User.validate_unique_email(
            instance=self.instance, email=value, is_admin_site=False
        )
        return super().validate(value)

    def validate_username(self, value):
        """
        Validate unique username for System site.
        """
        User.validate_unique_username(
            instance=self.instance, username=value, is_admin_site=False
        )
        return super().validate(value)


class AdminUserInviteSerializer(serializers.ModelSerializer):
    """
    Serializer for the User Admin create form.
    """

    profile = ProfileSerializer()
    roles = RoleSerializer(read_only=True, many=True)
    company = CompanySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "profile",
            "roles",
            "company",
        ]

    def validate_email(self, value):
        """
        Validate unique email for Admin site.
        """
        User.validate_unique_email(
            instance=self.instance, email=value, is_admin_site=True
        )
        return super().validate(value)


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Serializer for forgot password form.
    """

    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    """
    Serializer for reset password form.
    """

    password = serializers.CharField(max_length=255, write_only=True)
    token = serializers.CharField(max_length=255)

    def validate_password(self, value):
        """
        Validate new password.
        """

        password_validation.validate_password(value, self.instance)
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for change password form.
    """

    password = serializers.CharField(max_length=255, write_only=True)
    new_password = serializers.CharField(max_length=255, write_only=True)

    def validate_password(self, value):
        """
        Validate current password.
        """
        user = self.context.get("request").user

        # Authenticate user with the provided password
        if not authenticate(username_alias=user.username_alias, password=value):
            raise ValidationError(ERROR_MESSAGES["incorrect_password"])

        return value

    def validate_new_password(self, value):
        """
        Validate new password.
        """

        password_validation.validate_password(value, self.instance)
        return value


class UsersForCreationSerializer(serializers.Serializer):
    """
    Serializer for create a user form.
    """

    people_in_charge = BaseUserSerializer(many=True, read_only=True)
    people_in_charge_id = serializers.PrimaryKeyRelatedField(
        source="people_in_charge",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )


class MemoSerializer(serializers.ModelSerializer):
    """
    Serializer for Memo
    """

    class Meta:
        model = Memo
        fields = ["content", "is_open"]


class DailyReportSerializer(serializers.ModelSerializer):
    """
    Serializer for daily report
    """

    class Meta:
        model = DailyReport
        fields = ["id", "date", "remark", "is_submit"]
        read_only_fields = ["id"]
