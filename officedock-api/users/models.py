from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models import Q

from rest_framework.exceptions import ValidationError
from base.models import BaseModel
from base.exceptions import LockedError
from base.messages import ERROR_MESSAGES
from common.constants import ALLOW_IMAGE_FORMATS, USER_AVATAR_FOLDER_UPLOAD
from organizations.models import UsersOrganizations
from utils.jwt import JWTService

from .constants import (
    AvatarColors,
    CurrencyEnums,
    GenderTypes,
    LoginTypes,
    PEARL_LOGIN_BONUS,
    PEARL_TASK_COMPLETE,
    RoleTypes,
    TransactionTypes,
)
from .managers import ActiveUsersOnlyManager
from .services import UserService


class Permission(BaseModel):
    """
    Permission model.
    """

    name = models.CharField(max_length=255)


class RoleDetail(BaseModel):
    """
    Role detail with permissions.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="role_details",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    role = models.ForeignKey(
        "Role",
        related_name="role_details",
        on_delete=models.CASCADE,
    )
    permission = models.ForeignKey(
        "Permission",
        related_name="role_details",
        on_delete=models.CASCADE,
    )
    selection_result = models.CharField(null=True, blank=True)


class UserRole(BaseModel):
    """
    User role model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="user_roles",
        on_delete=models.CASCADE,
    )
    role = models.ForeignKey(
        "Role",
        related_name="user_roles",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        "User",
        related_name="user_roles",
        on_delete=models.CASCADE,
    )


class Role(BaseModel):
    """
    Role model.
    """

    company = models.ForeignKey(
        "companies.Company",
        related_name="roles",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    system_role = models.BooleanField(null=True, blank=True)
    permissions = models.ManyToManyField(
        "Permission",
        through="RoleDetail",
        related_name="roles",
    )

    def __str__(self) -> str:
        return str(self.name)

    @staticmethod
    def get_role(role_name):
        """
        Get role by name.
        """

        return Role.objects.filter(name=role_name).first()


class User(AbstractBaseUser, BaseModel, PermissionsMixin):
    """
    User model.
    """

    objects = ActiveUsersOnlyManager()

    USERNAME_FIELD = "username_alias"

    is_active = models.BooleanField(default=True)
    is_two_factor_auth = models.BooleanField(default=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    two_factor_auth_email = models.EmailField(null=True, blank=True)
    username_alias = models.TextField(unique=True, max_length=265)
    login_type = models.CharField(
        choices=LoginTypes.choices(),
        max_length=255,
        default=LoginTypes.EMAIL.value,
    )
    password = models.CharField(max_length=255)
    company = models.ForeignKey(
        "companies.Company",
        related_name="users",
        on_delete=models.CASCADE,
    )
    terms = models.ManyToManyField(
        "terms.Term", through="ReadTerm", related_name="users"
    )
    roles = models.ManyToManyField(
        "Role",
        through="UserRole",
        related_name="users",
    )
    confirm_reports = models.ManyToManyField(
        "ConfirmReport", related_name="users"
    )
    avatar_color = models.CharField(max_length=30, null=True, blank=True)
    avatar = models.ImageField(
        upload_to=USER_AVATAR_FOLDER_UPLOAD,
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOW_IMAGE_FORMATS),
        ],
        null=True,
        blank=True,
    )

    def save(self, *args, **kwargs):
        """
        Custom to set the password and username field
        """
        # Make sure the password is hashed if create new normal user
        # The password of superuser is hashed when creating use
        # createsuperuser script
        if self.id is None and self.password and not self.is_superuser:
            self.set_password(self.password)

        # Default two_factor_auth_email is email when creation.
        if (
            self.id is None
            and self.two_factor_auth_email is None
            and self.is_two_factor_auth
            and self.login_type == LoginTypes.EMAIL.value
            and self.email
        ):
            self.two_factor_auth_email = self.email

        # Validator two factor auth email when is 2FA
        if self.is_two_factor_auth and self.two_factor_auth_email is None:
            raise ValidationError(
                {"two_factor_auth_email": ERROR_MESSAGES["field_required"]}
            )
        if self.avatar_color is None:
            self.avatar_color = AvatarColors.random()

        super().save(*args, **kwargs)

    def set_profile(self, profile_data):
        """
        Set profile data.
        """

        if not hasattr(self, "profile"):
            Profile.objects.create(
                user=self,
                company=self.company,
            )

        for attr, value in profile_data.items():
            setattr(self.profile, attr, value)
        self.profile.save()

    def set_setting(self, setting_data):
        """
        Set setting data.
        """

        if not hasattr(self, "setting"):
            Setting.objects.create(
                user=self,
                company=self.company,
            )

        for attr, value in setting_data.items():
            setattr(self.setting, attr, value)
        self.setting.save()

    def verify_login_token(self, token):
        """
        Verify the logged in user's token if the role has been changed.
        """
        if not LoginToken.objects.filter(user=self, token=token).exists():
            raise LockedError()

        return True

    def login_token(self, token):
        """
        Save the token when the user login.
        """
        return LoginToken.objects.create(user=self, token=token)

    def validate_unique_email(instance, email, is_admin_site=False):
        """
        Validate unique email for Admin site and System site
        """

        # Define the query filter for email
        query_filter = User.objects.filter(Q(email=email) | Q(username=email))

        if instance and isinstance(instance, User):
            # Exclude the current instance from the query if it's an update
            query_filter = query_filter.exclude(id=instance.id)

        if is_admin_site:
            # Filter for admin users
            query_filter = query_filter.filter(
                roles__name=RoleTypes.OPERATION_ADMIN.value
            )
        else:
            # Exclude admin users for system site
            query_filter = query_filter.exclude(
                roles__name=RoleTypes.OPERATION_ADMIN.value
            )

        if email and query_filter.exists():
            raise ValidationError(ERROR_MESSAGES["email_exists"])

    def validate_unique_username(instance, username, is_admin_site=False):
        """
        Validate unique username for Admin site and System site
        """

        # Define the query filter for username
        query_filter = User.objects.filter(
            Q(email=username) | Q(username=username)
        )

        if instance and isinstance(instance, User):
            # Exclude the current instance from the query if it's an update
            query_filter = query_filter.exclude(id=instance.id)

        if is_admin_site:
            # Filter for admin users
            query_filter = query_filter.filter(
                roles__name=RoleTypes.OPERATION_ADMIN.value
            )
        else:
            # Exclude admin users for system site
            query_filter = query_filter.exclude(
                roles__name=RoleTypes.OPERATION_ADMIN.value
            )

        if username and query_filter.exists():
            raise ValidationError(ERROR_MESSAGES["username_exists"])

    def check_roles(self, roles, exclude=False):
        """
        Checks if the user has (or does not have, based on `exclude`) at least one role
        from the provided list or a single role.
        """
        # Ensure roles is always iterable (convert string to list if necessary)
        if isinstance(roles, str):
            roles = [roles]

        # Apply exclude or filter logic
        return (
            self.roles.exclude(name__in=roles).exists()
            if exclude
            else self.roles.filter(name__in=roles).exists()
        )

    def get_main_organization(self):
        user_org = UsersOrganizations.objects.filter(
            is_main=True, user=self
        ).first()

        return user_org.organization if user_org else None

    def use_coin(self, amount, transaction_type):
        """Use coins from user balance"""
        return UserService().update_balance(
            amount,
            transaction_type,
            self,
            transaction_type,
            CurrencyEnums.COIN.value,
            "use",
        )

    def received_coin(self, amount, transaction_type):
        """Add coins to user balance"""
        return UserService().update_balance(
            amount,
            transaction_type,
            self,
            transaction_type,
            CurrencyEnums.COIN.value,
            "receive",
        )

    def use_pearl(self, amount, transaction_type):
        """Use pearls from user balance"""
        return UserService().update_balance(
            amount,
            transaction_type,
            self,
            transaction_type,
            CurrencyEnums.PEARL.value,
            "use",
        )

    def received_pearl(self, amount, transaction_type):
        """Add pearls to user balance"""
        return UserService().update_balance(
            amount,
            transaction_type,
            self,
            transaction_type,
            CurrencyEnums.PEARL.value,
            "receive",
        )

    @property
    def coin(self):
        return self.balances.coin if self.balances else 0

    @property
    def pearl(self):
        return self.balances.pearl if self.balances else 0

    @property
    def exchangeable_coin(self):
        return self.balances.exchangeable_coin if self.balances else 0


class LoginBonus(BaseModel):
    """
    Login bonus tracking model
    """

    bonus_points = models.IntegerField(default=PEARL_LOGIN_BONUS)

    user = models.ForeignKey(
        User, related_name="login_bonuses", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="login_bonuses",
        on_delete=models.CASCADE,
    )


class TaskRewardLog(BaseModel):
    """
    Save log of which task Pearl was assigned to
    """

    task = models.ForeignKey(
        "tasks.Task", related_name="task_reward_logs", on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        "users.User", related_name="task_reward_logs", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="task_reward_logs",
        on_delete=models.CASCADE,
    )
    pearl_amount = models.IntegerField(default=PEARL_TASK_COMPLETE)
    rewarded_at = models.DateTimeField(null=True, blank=True)


class UserBalance(BaseModel):
    """
    User balance model
    """

    coin = models.IntegerField(blank=True, null=True, default=0)
    exchangeable_coin = models.IntegerField(blank=True, null=True, default=0)
    pearl = models.IntegerField(blank=True, null=True, default=0)

    user = models.OneToOneField(
        User, related_name="balances", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="user_balances",
        on_delete=models.CASCADE,
    )


class TransactionHistory(BaseModel):
    """
    Transaction history model
    """

    currency = models.CharField(
        max_length=10,
        choices=CurrencyEnums.choices(),
    )
    amount_used = models.IntegerField(default=0, blank=True, null=True)
    amount_received = models.IntegerField(default=0, blank=True, null=True)
    balance_after = models.IntegerField(blank=True, null=True)
    transaction_type = models.CharField(
        max_length=50,
        choices=TransactionTypes.choices(),
        default=TransactionTypes.OTHER.value,
    )
    memo = models.CharField(max_length=255, blank=True, null=True)

    user = models.ForeignKey(
        User, related_name="transaction_histories", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="transaction_histories",
        on_delete=models.CASCADE,
    )


class Setting(BaseModel):
    """
    User settings model.
    """

    is_check_self_task = models.BooleanField(default=False)
    is_check_self_schedule = models.BooleanField(default=False)
    is_check_company_schedule = models.BooleanField(default=False)
    is_enter_send_message = models.BooleanField(default=False)
    is_sorting_task_by_deadline = models.BooleanField(default=False)
    is_sorting_task_by_important = models.BooleanField(default=False)
    kanban_zoom = models.IntegerField(default=100)
    schedule_zoom = models.IntegerField(default=100)
    tab_visibility = models.JSONField(default=dict, blank=True, null=True)
    date_filter_schedule_from = models.CharField(blank=True, null=True)
    task_filter = models.JSONField(blank=True, null=True)
    is_show_list_kanban = models.BooleanField(default=False)
    is_show_week_schedule = models.BooleanField(default=False)
    is_show_my_template = models.BooleanField(default=False)
    user = models.OneToOneField(
        "User", related_name="setting", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="setting",
        on_delete=models.CASCADE,
    )

    def reset_sort_task(self):
        """
        Handle reset sort task
        """
        self.is_sorting_task_by_deadline = False
        self.is_sorting_task_by_important = False
        self.save()


class Profile(BaseModel):
    """
    Profile model.
    """

    full_name = models.CharField(max_length=255)
    birthday = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20, choices=GenderTypes.choices(), null=True, blank=True
    )
    user = models.OneToOneField(
        "User", related_name="profile", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="profiles",
        on_delete=models.CASCADE,
    )

    def __str__(self) -> str:
        return self.full_name


class Memo(BaseModel):
    """ """

    user = models.OneToOneField(
        "User", related_name="memo", on_delete=models.CASCADE
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="memos",
        on_delete=models.CASCADE,
    )
    content = models.TextField(null=True, blank=True)
    is_open = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        """
        Custom save method
        """
        self.company_id = self.user.company_id
        super().save(*args, **kwargs)


class LoginToken(BaseModel):
    """
    Login token model
    """

    user = models.ForeignKey(
        "User", related_name="tokens", on_delete=models.CASCADE
    )
    token = models.TextField()
    is_block = models.BooleanField(default=False)


class UserVerification(BaseModel):
    """
    User verification model.
    """

    token = models.CharField(max_length=255, blank=True, null=True)
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_attempts = models.IntegerField(blank=True, null=True)
    steps = models.IntegerField(blank=True, null=True)
    user = models.OneToOneField(
        "User",
        related_name="user_verification",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )


class ResetPassword(BaseModel):
    """
    Reset password model.
    """

    user = models.ForeignKey(
        "User", related_name="reset_password", on_delete=models.CASCADE
    )
    token = models.CharField(max_length=255)

    @staticmethod
    def create(user):
        """
        Create a new reset password.
        """

        # Remove old token if any
        ResetPassword.objects.filter(user=user).delete()
        jwt_service = JWTService()
        token = jwt_service.encode_token(user.id, user.email)
        return ResetPassword.objects.create(user=user, token=token)

    @staticmethod
    def verify(token):
        """
        Verify a reset password.
        """

        jwt_service = JWTService()
        token_decode = jwt_service.decode_token(token)
        user = User.objects.filter(pk=token_decode.get("id")).first()
        if not user:
            return None

        token_obj = ResetPassword.objects.filter(user=user, token=token)
        return user if token_obj.exists() else None


class ReadTerm(BaseModel):
    """
    Read term of user model.
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="read_terms",
    )
    term = models.ForeignKey(
        "terms.Term",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="read_terms",
    )
    company = models.ForeignKey(
        "companies.Company",
        related_name="read_terms",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.user:
            self.company_id = self.user.company_id

        super().save(*args, **kwargs)


class DailyReport(BaseModel):
    """
    Daily report of user
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="daily_reports",
    )
    date = models.DateField(auto_now=False, auto_now_add=False)
    remark = models.TextField(null=True, blank=True)
    is_submit = models.BooleanField(default=False)
    company = models.ForeignKey(
        "companies.Company",
        related_name="daily_reports",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.user:
            self.company_id = self.user.company_id

        super().save(*args, **kwargs)


class ConfirmReport(BaseModel):
    """
    Confirm report of user
    """

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="reported_confirmations",
    )
    confirm_by = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="confirmed_reports",
    )
    date = models.DateField(auto_now=False, auto_now_add=False)
    is_confirmed = models.BooleanField(default=False)
    company = models.ForeignKey(
        "companies.Company",
        related_name="confirm_reports",
        on_delete=models.CASCADE,
    )

    def save(self, *args, **kwargs):
        """
        Set default company
        """
        if self.user:
            self.company_id = self.user.company_id

        super().save(*args, **kwargs)
