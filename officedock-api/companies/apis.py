from django.utils.crypto import get_random_string
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from base.permissions import IsOperationAdminOnly
from base.apis import BaseAPIViewSet

from common.filters import CustomOrderFilter
from common.utils import delete_file, get_username_alias
from users.constants import RoleTypes, LoginTypes
from users.models import Role, User, Profile
from utils.mail import MailService
from .filters import CompanyFilter
from .models import Company, Contract
from .serializers import (
    BaseCompanySerializer,
    CompanySerializer,
    CompanySettingSerializer,
    ContractSerializer,
)


@extend_schema(tags=["Admin > Company"])
class CompanyViewSet(BaseAPIViewSet, viewsets.ModelViewSet):
    """
    API endpoint for Company.
    """

    queryset = Company.objects.order_by("created_at").all()
    serializer_class = CompanySerializer
    permission_classes = [IsOperationAdminOnly]
    filter_backends = [CustomOrderFilter, DjangoFilterBackend]
    ordering_fields = {
        "id": "id",
        "name": "name",
        "start_date": "contract__start_date",
        "end_date": "contract__end_date",
    }
    filterset_class = CompanyFilter

    @transaction.atomic
    def perform_create(self, serializer):
        """Handle create company with user info"""
        serializer_data = serializer.validated_data
        user_data = {"email": serializer_data.pop("email")}
        profile = {"full_name": serializer_data.pop("fullname")}
        contract = serializer_data.pop("contract")
        # Create company and contract
        company = serializer.save()
        Contract.objects.create(**contract, company=company)

        # Create user with fullname in profile
        user_data["two_factor_auth_email"] = user_data["email"]
        user_data["password"] = get_random_string(8)
        user_data["login_type"] = LoginTypes.EMAIL.value
        user_data["username_alias"] = get_username_alias(
            login_text=user_data["email"]
        )
        user_data["is_two_factor_auth"] = False

        user = User.objects.create(company=company, **user_data)
        Profile.objects.create(user=user, company=company, **profile)

        # Add system admin to user
        role = Role.get_role(RoleTypes.SYSTEM_ADMIN.value)
        user.roles.add(role, through_defaults={"company": company})

        # Save calendar organization
        calendar_org = company.get_calendar_organization()
        user.organizations.add(
            calendar_org,
            through_defaults={
                "company": company,
                "is_main": False,
            },
        )

        # Send mail to user
        mail_service = MailService()
        mail_service.send_admin_create_company_by_email(
            user.email, user_data["password"], company
        )

    @action(
        methods=["POST"],
        detail=True,
        url_path="contract",
        serializer_class=ContractSerializer,
    )
    def contract(self, request, pk=None):
        """
        Create contract for Company
        """
        company = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=company)
        return self.response_ok(CompanySerializer(company).data)

    def perform_destroy(self, instance):
        """Handle destroy company"""
        instance.organizations_statistic_categories.all().delete()

        # Remove all avatar users
        for user in instance.users.all():
            if user.avatar:
                delete_file(user.avatar.name)

        # Remove all icon orgs
        for organization in instance.organizations.all():
            if organization.icon:
                delete_file(organization.icon.name)

        # Remove all file in chats
        for chat in instance.chat_files.all():
            if chat.original_file:
                delete_file(chat.original_file.name)

            if chat.compressed_file:
                delete_file(chat.compressed_file.name)

        instance.delete()


@extend_schema(tags=["System > Company"])
class SystemCompanyViewSet(BaseAPIViewSet, mixins.RetrieveModelMixin):
    """
    API endpoint for system company operations.

    This viewset handles company-level system settings and configurations.
    It provides endpoints for authenticated users to manage their company settings.
    Inherits from BaseAPIViewSet for common API functionality.
    """

    queryset = Company.objects.order_by("created_at").all()
    serializer_class = BaseCompanySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Override the default queryset to only return the company associated with the authenticated user.
        """
        return super().get_queryset().filter(id=self.request.user.company.id)

    @action(
        methods=["POST"],
        detail=False,
        url_path="settings",
        serializer_class=CompanySettingSerializer,
    )
    def company_settings(self, request):
        """
        Update company settings endpoint.

        This endpoint allows authenticated users to update their company's system settings.
        Currently supports updating the holidays calendar visibility setting.
        """
        # Get the company associated with the authenticated user
        company = request.user.company

        # Validate the incoming request data using the serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # Update company settings
        # Currently only handles the holidays calendar visibility setting
        company.is_show_holidays_calendar = validated_data.pop(
            "is_show_holidays_calendar", False
        )
        company.save()

        return self.response_ok()
