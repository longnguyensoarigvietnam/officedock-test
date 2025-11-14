from datetime import datetime, time

from django.contrib.auth import password_validation, authenticate
from django.db.models import Q
from django.utils import timezone
from django.utils.timezone import now
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from base.messages import ERROR_MESSAGES
from common.utils import calculate_company_dates, get_signed_url
from common.constants import (
    AVATAR_GCS_EXPIRATION_SECONDS,
    USER_AVATAR_UPLOAD_MAX_SIZE,
)
from companies.constants import CompanyStatus
from companies.serializers import CompanySerializer
from organizations.models import UsersOrganizations, Organization
from organizations.serializers import (
    OrganizationSerializer,
    OrganizationsForCreationSerializer,
)
from roles.constants import Actions, Screens, SelectionResultOptions
from roles.utils import has_permission
from tasks.models import TaskStatus
from terms.constants import TermTypes, TermStatus
from terms.models import Term
from users.models import (
    Memo,
    Profile,
    Role,
    User,
    UserBalance,
    UserVerification,
    Setting,
    DailyReport,
    TransactionHistory,
)
from users.constants import RoleTypes
from companies.models import Company


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
            "full_name",
            "login_type",
            "avatar_color",
            "avatar",
            "deleted_at",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "login_type": {"read_only": True},
        }

    def to_representation(self, instance):
        """Override file URL representation to ensure consistency"""
        representation = super().to_representation(instance)

        if instance.avatar:
            representation["avatar"] = get_signed_url(
                instance.avatar, AVATAR_GCS_EXPIRATION_SECONDS
            )

        return representation

    def validate_password(self, value):
        """
        Validate user password
        """
        if value:
            password_validation.validate_password(value)
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

    def validate_avatar(self, value):
        """
        Validate size avatar upload.
        """
        if value and value.size > USER_AVATAR_UPLOAD_MAX_SIZE:
            raise serializers.ValidationError(
                {
                    "detail": ERROR_MESSAGES["max_file_size"].format(
                        max_size="30MB"
                    )
                }
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


class TaskFilterSerializer(serializers.Serializer):
    """
    Serializer for task filter setting
    """

    organization = serializers.JSONField(required=False, allow_null=True)
    category = serializers.JSONField(required=False, allow_null=True)
    tag = serializers.JSONField(required=False, allow_null=True)


class SettingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model.
    """

    tab_visibility = serializers.JSONField(required=False, allow_null=True)
    kanban_zoom = serializers.FloatField(
        min_value=0, max_value=100, required=False, allow_null=True
    )

    schedule_zoom = serializers.FloatField(
        min_value=0, max_value=100, required=False, allow_null=True
    )
    date_filter_schedule_from = serializers.CharField(
        required=False, allow_null=True
    )
    task_filter = TaskFilterSerializer(required=False)
    is_show_list_kanban = serializers.BooleanField(required=False)
    is_show_week_schedule = serializers.BooleanField(required=False)
    is_show_my_template = serializers.BooleanField(required=False)

    class Meta:
        model = Setting
        fields = [
            "is_check_self_task",
            "is_check_self_schedule",
            "is_check_company_schedule",
            "is_enter_send_message",
            "is_sorting_task_by_deadline",
            "is_sorting_task_by_important",
            "is_sorting_task_by_important",
            "kanban_zoom",
            "schedule_zoom",
            "tab_visibility",
            "date_filter_schedule_from",
            "task_filter",
            "is_show_list_kanban",
            "is_show_week_schedule",
            "is_show_my_template",
        ]

    def to_representation(self, instance):
        """
        Representation of setting
        """
        representation = super().to_representation(instance)
        representation["date_filter_schedule_from"] = datetime.combine(
            now(), time.min
        )
        if instance.date_filter_schedule_from:
            representation[
                "date_filter_schedule_from"
            ] = instance.date_filter_schedule_from
        return representation

    def validate_tab_visibility(self, value):
        """Validate element in tab visibility"""
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                ERROR_MESSAGES["must_be_dictionary"]
            )

        all_statuses = TaskStatus.objects.values_list("id", flat=True)
        for key, val in value.items():
            try:
                key_int = int(key)
            except ValueError:
                raise serializers.ValidationError(
                    ERROR_MESSAGES["status_invalid"].format(key=key)
                )

            if key_int not in all_statuses:
                raise serializers.ValidationError(
                    ERROR_MESSAGES["status_invalid"].format(key=key)
                )
            if not isinstance(val, bool):
                raise serializers.ValidationError(
                    ERROR_MESSAGES["boolean_field"].format(key=key)
                )

        return value


class OrganizationForUserSerializer(OrganizationSerializer):
    """
    Serializer for the Organization without action.
    """

    is_main = serializers.SerializerMethodField(read_only=True)
    has_task_reference = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            "id",
            "uuid",
            "name",
            "superior",
            "superior_id",
            "user_count",
            "is_main",
            "icon",
            "icon_color",
            "type",
            "has_task_reference",
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

    def get_has_task_reference(self, obj):
        """
        Check organization to linked to task.
        """
        user = self.context.get("user")
        return (
            obj.tasks.filter(people_in_charge=user).exists() if user else False
        )


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
            "full_name",
            "company",
            "organizations",
            "login_type",
            "setting",
            "unread_terms",
            "avatar_color",
            "avatar",
            "created_at",
            "deleted_at",
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
            for item in UsersOrganizations.objects.filter(user=obj)
            .select_related("organization")
            .order_by("-is_main", "id")
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


class CompanyLoginSerializer(serializers.ModelSerializer):
    """
    Return data for company when login
    """

    start_editable_date = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "close_date",
            "editable_after_closing",
            "start_editable_date",
        ]

    def get_start_editable_date(self, obj):
        """
        Get start editable date of actual duration
        """
        date_now = now().date()
        company_dates = calculate_company_dates(obj)
        date_after_closing = company_dates["date_after_closing"]
        start_editable_date = company_dates["start_date_calculation_deadline"]
        date_after_data_edit_deadline = company_dates[
            "date_after_data_edit_deadline"
        ]

        if (
            date_now >= date_after_data_edit_deadline
            and date_after_closing < date_now
        ):
            start_editable_date = date_after_closing

        return datetime.combine(start_editable_date, time.min)


class UserLoginSerializer(BaseUserSerializer):
    """
    Serializer for the User model.
    """

    profile = ProfileSerializer()
    company = CompanyLoginSerializer()
    unread_terms = serializers.SerializerMethodField(read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "company",
            "username",
            "email",
            "is_two_factor_auth",
            "two_factor_auth_email",
            "permissions",
            "profile",
            "full_name",
            "login_type",
            "unread_terms",
        ]

    def get_permissions(self, obj):
        """
        Get unique role permissions for the given object.
        """
        company_status = obj.company.status
        is_payment_failed = company_status == CompanyStatus.SUSPENDED.value
        if company_status == CompanyStatus.RETRY_PAYMENT.value:
            is_payment_failed = (
                obj.company.company_plan.stripe_subscription_id == None
            )

        permissions = set()
        for role in obj.roles.all():
            perms = role.permissions.exclude(
                Q(
                    role_details__selection_result=SelectionResultOptions.NOT_ALLOWED.value
                )
                | Q(role_details__selection_result__isnull=True)
            )
            # Just allow access to Payment Management
            if is_payment_failed:
                perms = perms.filter(
                    name__startswith=Screens.PAYMENT_MANAGEMENT.value
                )
            permissions.update(perms.values_list("name", flat=True))

        return list(permissions)

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
            "full_name",
            "organizations",
            "actions",
            "email",
            "avatar_color",
            "avatar",
            "deleted_at",
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
        item_org_ids = [org.id for org in obj.organizations.all()]

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


class SystemUserInviteSerializer(BaseUserSerializer):
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
            "avatar",
            "username",
            "email",
            "password",
            "profile",
            "full_name",
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
            password_validation.validate_password(value)

            if self.instance and authenticate(
                None,
                username_alias=self.instance.username_alias,
                password=value,
            ):
                raise ValidationError(ERROR_MESSAGES["password_not_same"])

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

    def validate_organization_ids(self, value):
        """
        Validate that organizations linked to tasks cannot be removed from the user's organizations.
        """
        instance = self.instance

        if instance and value is not None:
            # Collect the set of organization IDs provided in the input
            old_org = set(instance.organizations.values_list("id", flat=True))
            orgs_to_update = set(item["organization"].id for item in value)

            if orgs_to_update != old_org:
                # Collect the set of organization IDs where the user is in charge of tasks
                orgs_with_tasks = set(
                    instance.in_charge_tasks.filter(
                        organization__isnull=False, deleted_at__isnull=True
                    ).values_list("organization", flat=True)
                )
                # Find organizations with tasks that are being removed
                orgs_being_removed = orgs_with_tasks - orgs_to_update

                if orgs_being_removed:
                    names = (
                        Organization.objects.filter(
                            id__in=list(orgs_being_removed)
                        )
                        .order_by("created_at")
                        .values_list("name", flat=True)
                    )
                    raise serializers.ValidationError(
                        ERROR_MESSAGES["organization_linked_to_task"].format(
                            name=", ".join(list(names))
                        )
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
            "full_name",
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
        if value:
            password_validation.validate_password(value)
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
        if value:
            password_validation.validate_password(value)
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

    is_confirmed = serializers.BooleanField(required=False, allow_null=True)

    class Meta:
        model = DailyReport
        fields = ["id", "date", "remark", "is_submit", "is_confirmed"]
        read_only_fields = ["id"]


class TransactionHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for transaction history
    """

    class Meta:
        model = TransactionHistory
        fields = [
            "id",
            "currency",
            "amount_used",
            "amount_received",
            "balance_after",
            "transaction_type",
            "memo",
            "created_at",
        ]
        read_only_fields = ["id"]


class TransactionManagementSerializer(serializers.ModelSerializer):
    """
    Serializer for transaction history management
    """

    user = BaseUserSerializer()

    class Meta:
        model = TransactionHistory
        fields = [
            "id",
            "user",
            "currency",
            "amount_used",
            "amount_received",
            "company_balance_after",
            "transaction_type",
            "memo",
            "created_at",
        ]
        read_only_fields = ["id"]


class UserBalanceSerializer(serializers.ModelSerializer):
    """
    Serializer for user balance
    """

    class Meta:
        model = UserBalance
        fields = ["id", "coin", "pearl", "exchangeable_coin"]


class UserPermissionsSerializer(UserSerializer):
    """
    Serializer for user permissions
    """

    class Meta:
        model = User
        fields = ["id", "permissions"]
