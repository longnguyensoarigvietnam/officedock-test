from django.db import transaction
from rest_framework import serializers

from companies.constants import PaymentTypes
from companies.models import (
    Company,
    CompanyPaymentMethod,
    CompanyTransaction,
    Contract,
)
from base.messages import ERROR_MESSAGES
from plans.models import Plan
from plans.serializers import PlanSerializer
from users.models import User


class ContractSerializer(serializers.ModelSerializer):
    """
    Serializer for Contract model.
    """

    class Meta:
        model = Contract
        fields = [
            "id",
            "created_at",
            "start_date",
            "end_date",
            "next_renewal_at",
            "system_main_purpose",
            "department",
            "industry",
            "address",
            "phone",
        ]
        read_only_fields = ["next_renewal_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )
        return attrs

    def validate_system_main_purpose(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                ERROR_MESSAGES["must_be_array"].format(
                    field="system_main_purpose"
                )
            )
        return value

    def validate_department(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                ERROR_MESSAGES["must_be_array"].format(field="department")
            )
        return value


class BaseCompanySerializer(serializers.ModelSerializer):
    """
    Serializer for base company model.
    """

    contract = ContractSerializer(required=False)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "contract",
            "is_show_holidays_calendar",
        ]
        read_only_fields = ["is_show_holidays_calendar"]


class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model.
    """

    contract = ContractSerializer(required=False)
    total_users = serializers.SerializerMethodField(read_only=True)
    plan = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "contract",
            "is_show_holidays_calendar",
            "total_users",
            "plan",
            "status",
            "responsible_person_mail",
            "responsible_person_name",
        ]
        read_only_fields = ["is_show_holidays_calendar"]

    def get_plan(self, instance):
        if hasattr(instance, "company_plan") and hasattr(
            instance.company_plan, "plan"
        ):
            return PlanSerializer(instance.company_plan.plan).data
        return None

    def get_total_users(self, obj):
        return obj.users.count()

    @transaction.atomic
    def update(self, instance, validated_data):
        contract_data = validated_data.pop("contract", None)

        if contract_data is not None:
            # If the contract already exists, update it
            if hasattr(instance, "contract"):
                contract_serializer = ContractSerializer(
                    instance.contract, data=contract_data
                )
                contract_serializer.is_valid(raise_exception=True)
                contract_serializer.save()
            else:
                # If there is no contract, create a new one and link to the company
                contract_serializer = ContractSerializer(data=contract_data)
                contract_serializer.is_valid(raise_exception=True)
                contract_serializer.save(company=instance)

        return super().update(instance, validated_data)


class CompanySettingSerializer(serializers.Serializer):
    """
    Serializer for company settings
    """

    is_show_holidays_calendar = serializers.BooleanField(default=False)


class CreationCompanySerializer(serializers.Serializer):
    """
    Serializer for creation company
    """

    company_name = serializers.CharField()
    payment_method = serializers.CharField()
    address = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)
    responsible_person_name = serializers.CharField(required=False)
    responsible_person_mail = serializers.EmailField(required=False)
    plan = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Plan.objects.all(),
        error_messages={
            "does_not_exist": ERROR_MESSAGES["plan_does_not_exists"],
            "invalid": ERROR_MESSAGES["plan_invalid"],
        },
    )
    stripe_payment_method_id = serializers.CharField()
    industry = serializers.CharField(required=False)
    system_main_purpose = serializers.JSONField(required=False)
    department = serializers.JSONField(required=False)

    def validate_system_main_purpose(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                ERROR_MESSAGES["must_be_array"].format(
                    field="system_main_purpose"
                )
            )
        return value

    def validate_department(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                ERROR_MESSAGES["must_be_array"].format(field="department")
            )
        return value

    def validate_responsible_person_mail(self, value):
        # FIXME: Check duplicate email in User table
        User.validate_unique_email(
            instance=None, email=value, is_admin_site=False
        )
        if Company.objects.filter(responsible_person_mail=value).exists():
            raise serializers.ValidationError(ERROR_MESSAGES["email_exists"])
        return value


class RetrieveCompanySerializer(CompanySerializer):
    """
    Serializer class for retrieve company
    """

    payment_method = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "contract",
            "plan",
            "status",
            "max_user_in_contract_period",
            "max_user_at",
            "total_users",
            "payment_method",
            "responsible_person_mail",
            "responsible_person_name",
        ]

    def get_payment_method(self, instance):
        """
        Get default payment method of company
        """
        payment_method = instance.payment_methods.filter(
            is_default=True
        ).first()
        return payment_method.type if payment_method else None


class CompanyTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for company transaction
    """

    plan = serializers.CharField(source="plan.name", allow_null=True)

    class Meta:
        model = CompanyTransaction
        fields = [
            "type",
            "invoice_target",
            "plan_start_at",
            "plan_end_at",
            "status",
            "paid_at",
            "plan",
        ]


class AddCardSerializer(serializers.Serializer):
    """
    Serializer for add card to company
    """

    stripe_payment_method_id = serializers.CharField()
    payment_method = serializers.ChoiceField(choices=PaymentTypes.choices())


class SetDefaultCardSerializer(serializers.Serializer):
    """
    Serializer for set default card to company
    """

    payment_method_id = serializers.PrimaryKeyRelatedField(
        source="payment_method", queryset=CompanyPaymentMethod.objects.all()
    )
