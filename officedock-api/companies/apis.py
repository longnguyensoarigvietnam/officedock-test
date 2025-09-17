from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction

from base.permissions import IsOperationAdminOnly
from base.apis import BaseAPIViewSet

from common.filters import CustomOrderFilter
<<<<<<< HEAD
from common.utils import (
    delete_file,
    get_client_ip,
    get_user_agent,
    get_username_alias,
)
from users.constants import RoleTypes, LoginTypes
from users.models import Role, User, Profile, UserActivityLog
from utils.mail import MailService
=======
from common.serializers import EmptySerializer
from common.services.stripe_service import StripeService
from common.utils import delete_file
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
)
from companies.services import CompanyService
>>>>>>> 3d4ec0fa (API: Initial plan DB and implement API creation and active company)
from .filters import CompanyFilter
from .models import Company, CompanyPaymentMethod, CompanyPlan, Contract
from .serializers import (
    BaseCompanySerializer,
    CompanySerializer,
    CompanySettingSerializer,
    CompanyTransactionSerializer,
    ContractSerializer,
    CreationCompanySerializer,
    RetrieveCompanySerializer,
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

    def __init__(self, *args, **kwargs):
        """
        Initialize the Company service
        """
        super().__init__(*args, **kwargs)
        self.company_service = CompanyService()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RetrieveCompanySerializer
        return super().get_serializer_class()

    @action(
        url_path="active",
        detail=True,
        methods=["POST"],
        serializer_class=EmptySerializer,
    )
    @transaction.atomic()
    def handle_active_company(self, request, pk):
        """
        Activate a company by creating its admin user, assigning roles,
        setting up Stripe subscription, and updating contract status.
        """
        company = self.get_object()
        self.company_service.active_company(company)
        return self.response_ok()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "type",
                enum=[
                    CompanyTransactionTypes.INVOICE.value,
                    CompanyTransactionTypes.PLAN.value,
                    CompanyTransactionTypes.POINT.value,
                ],
            )
        ]
    )
    @action(
        methods=["GET"],
        detail=True,
        url_path="transactions",
        serializer_class=CompanyTransactionSerializer,
    )
    def get_transactions(self, request, pk=None):
        """
        Change plan of company
        """
        company = self.get_object()
        transaction_type = request.query_params.get("type")
        if transaction_type:
            transactions = company.transactions.filter(
                type=transaction_type
            ).all()
        else:
            transactions = company.transactions.all()
        return self.response_pagination(
            request,
            transactions,
            CompanyTransactionSerializer,
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
class SystemCompanyViewSet(
    BaseAPIViewSet,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
):
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
        return super().get_queryset().filter(id=self.request.user.company_id)

    def get_permissions(self):
        """
        Custom permission by action
        """
        permission_classes = (
            [AllowAny] if self.action == "create" else [IsAuthenticated]
        )
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == "create":
            return CreationCompanySerializer
        return super().get_serializer_class()

    @transaction.atomic()
    def create(self, request):
        """
        Create company endpoint

        This endpoint allows any sites to create their company's with payment method of Stripe.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer_data = serializer.validated_data
        stripe_payment_method_id = serializer_data.pop(
            "stripe_payment_method_id"
        )
        payment_method = serializer_data.pop("payment_method")
        plan = serializer_data.pop("plan")
        company_data = {
            "name": serializer_data.pop("company_name"),
            "status": CompanyStatus.PENDING_APPROVAL.value,
            "max_user_at": now(),
        }
        # Create company
        company = Company.objects.create(**company_data)

        # Create contract of company
        contract_data = {
            "address": serializer_data.pop("address"),
            "phone": serializer_data.pop("phone"),
            "responsible_person_name": serializer_data.pop(
                "responsible_person_name"
            ),
            "responsible_person_mail": serializer_data.pop(
                "responsible_person_mail"
            ),
            "industry": serializer_data.pop("industry"),
            "system_main_purpose": serializer_data.pop("system_main_purpose"),
            "implementation_main_issue": serializer_data.pop(
                "implementation_main_issue"
            ),
        }
        Contract.objects.create(**contract_data, company=company)
        # Create Stripe customer and attach payment method to customer
        StripeService().get_or_create_customer(company)
        stripe_payment = StripeService().attach_payment_method_to_customer(
            company, stripe_payment_method_id, is_create_company=True
        )
        # Create payment method of company
        CompanyPaymentMethod.objects.create(
            company=company,
            type=payment_method,
            stripe_payment_method_id=stripe_payment_method_id,
            stripe_fingerprint=stripe_payment["fingerprint"],
            is_default=True,
        )

        # Create plan of company
        CompanyPlan.objects.create(company=company, plan=plan)
        return self.response_created()

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
