from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from base.messages import ERROR_MESSAGES
from base.permissions import (
    ActionPermission,
    IsApiKeyValid,
    IsOperationAdminOnly,
)
from base.apis import BaseAPIViewSet

from common.filters import CustomOrderFilter
from common.serializers import EmptySerializer
from common.services.stripe_service import StripeService
from common.utils import delete_file
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
)
from companies.services import CompanyService

from roles.constants import Screens
from .filters import CompanyFilter
from .models import Company, CompanyPaymentMethod, CompanyPlan, Contract
from .serializers import (
    AddCardSerializer,
    BaseCompanySerializer,
    CompanyPaymentMethodSerializer,
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

    queryset = Company.objects.order_by("-created_at").all()
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

    @transaction.atomic()
    def perform_update(self, serializer):
        """Override DRF's `perform_update` to add business logic after a company update."""
        current_company = serializer.instance
        old_name = current_company.name
        old_email = current_company.responsible_person_mail
        company = serializer.save()
        self.company_service.handle_invoice_base_on_status(company)
        if (
            old_name != company.name
            or old_email != company.responsible_person_mail
        ):
            StripeService().update_customer(company)

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
        self.company_service.active_company(request, company)
        return self.response_ok()

    @action(
        url_path="change-plan",
        detail=True,
        methods=["POST"],
        serializer_class=EmptySerializer,
    )
    @transaction.atomic()
    def handle_change_plan_company(self, request, pk):
        """
        Activate a company by creating its admin user, assigning roles,
        setting up Stripe subscription, and updating contract status.
        """
        company = self.get_object()
        self.company_service.change_plan(company)
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
            transactions.order_by("-created_at"),
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

    @action(
        methods=["POST"],
        detail=True,
        url_path="terminate-contract",
        serializer_class=EmptySerializer,
    )
    def handle_cancellation_pending_contract(self, request, pk=None):
        """
        Handle cancellation pending contract for Company and cancel subscription Stripe
        """
        company = self.get_object()
        self.company_service.cancellation_pending_contract(company)
        return self.response_ok()

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
        if self.action == "create":
            return [IsApiKeyValid()]

        return super().get_permissions()

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
            "responsible_person_name": serializer_data.pop(
                "responsible_person_name"
            ),
            "responsible_person_mail": serializer_data.pop(
                "responsible_person_mail"
            ),
        }
        # Create company
        company = Company.objects.create(**company_data)

        # Create contract of company
        contract_data = {
            "address": serializer_data.pop("address"),
            "phone": serializer_data.pop("phone"),
            "industry": serializer_data.pop("industry"),
            "system_main_purpose": serializer_data.pop("system_main_purpose"),
            "department": serializer_data.pop("department"),
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
            **stripe_payment
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


@extend_schema(tags=["System > Management Payment"])
class ManagePaymentViewSet(BaseAPIViewSet, mixins.ListModelMixin):
    """
    API endpoint for management payment method.
    """

    queryset = CompanyPaymentMethod.objects.all()
    permission_classes = [ActionPermission]
    serializer_class = CompanyPaymentMethodSerializer
    screen_name = Screens.PAYMENT_MANAGEMENT.value

    def get_queryset(self):
        # Get the company associated with the authenticated user
        company = self.request.user.company

        return (
            super()
            .get_queryset()
            .filter(company=company)
            .order_by("-created_at")
        )

    @action(
        methods=["POST"],
        detail=False,
        url_path="add-card",
        serializer_class=AddCardSerializer,
    )
    @transaction.atomic()
    def add_card_to_company(self, request):
        """
        Add a new payment card to the authenticated user's company.

        Steps:
        - Ensure the company has a Stripe customer ID (create if missing).
        - Attach the provided payment method to the customer in Stripe.
        - Save the payment method details in the local database.
        - If no active subscription exists, create a new postpaid subscription.
        - Retry unpaid invoices after successfully adding the card.
        """
        # Get the company associated with the authenticated user
        company = request.user.company

        # Validate the incoming request data using the serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        stripe_payment_method_id = validated_data.pop(
            "stripe_payment_method_id"
        )
        payment_method = validated_data.pop("payment_method")

        # Create Stripe customer and attach payment method to customer
        StripeService().get_or_create_customer(company)
        stripe_payment = StripeService().attach_payment_method_to_customer(
            company, stripe_payment_method_id
        )
        # Create payment method of company
        payment_method = CompanyPaymentMethod.objects.create(
            company=company,
            type=payment_method,
            stripe_payment_method_id=stripe_payment_method_id,
            **stripe_payment
        )
        # Check exists subscription
        if (
            StripeService().retrieve_subscription(
                company.company_plan.stripe_subscription_id
            )
            is None
        ):
            # Create subscription
            subscription = (
                StripeService().create_postpaid_subscription_with_invoice(
                    company
                )
            )
            company.company_plan.stripe_subscription_id = subscription.id
            company.company_plan.save(
                update_fields=[
                    "stripe_subscription_id",
                ]
            )
        # Check if all payment methods failed retry
        if (
            not company.payment_methods.filter(is_retry_failed=False)
            .exclude(id=payment_method.id)
            .exists()
        ):
            CompanyService().handle_pay_invoice_failed_retry(
                company, stripe_payment_method_id
            )
            # Change default payment method of Stripe
            StripeService().modify_default_payment_method(
                company.stripe_customer_id,
                payment_method.stripe_payment_method_id,
            )
            # Update default card of company
            company.payment_methods.update(is_default=False)
            payment_method.is_default = True
            payment_method.save(update_fields=["is_default"])

        return self.response_ok(
            CompanyPaymentMethodSerializer(payment_method).data
        )

    @action(
        methods=["POST"],
        detail=True,
        url_path="set-default-card",
        serializer_class=EmptySerializer,
    )
    @transaction.atomic()
    def set_default_card(self, request, pk=None):
        """Set a payment method as the default card for the authenticated user's company."""
        # Get the company associated with the authenticated user
        company = request.user.company
        payment_method = self.get_object()
        # Change default payment method of Stripe
        StripeService().modify_default_payment_method(
            company.stripe_customer_id, payment_method.stripe_payment_method_id
        )
        # Update default card of company
        company.payment_methods.update(is_default=False)
        payment_method.is_default = True
        payment_method.save(update_fields=["is_default"])

        return self.response_ok()

    @action(methods=["DELETE"], detail=True, url_path="remove-card")
    @transaction.atomic()
    def remove_a_card_of_company(self, request, pk=None):
        """Remove a payment card from the authenticated user's company."""
        payment_method = self.get_object()
        if payment_method.is_default:
            raise ValidationError(
                {"detail": ERROR_MESSAGES["cannot_remove_card"]}
            )
        # Change default payment method of Stripe
        StripeService().detach_payment_method(
            payment_method.stripe_payment_method_id
        )
        # Delete from local DB
        payment_method.delete()

        return self.response(status_code=status.HTTP_204_NO_CONTENT)
