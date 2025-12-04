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
from plans.constants import (
    MAX_LIMIT_PERSON,
    MAX_MONTHLY_FEE,
    MIN_EXCHANGEABLE_AMOUNT,
    MIN_MONTHLY_FEE,
)
from plans.models import Plan
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


class CustomPlanSerializer(serializers.Serializer):
    """
    Serializer for custom plan of company
    """

    monthly_fee = serializers.IntegerField(
        min_value=MIN_MONTHLY_FEE, max_value=MAX_MONTHLY_FEE
    )
    exchangeable_amount = serializers.IntegerField(
        min_value=MIN_EXCHANGEABLE_AMOUNT, max_value=MAX_MONTHLY_FEE
    )
    limit_person = serializers.IntegerField(max_value=MAX_LIMIT_PERSON)

    def validate(self, attrs):
        fields = ["monthly_fee", "exchangeable_amount", "limit_person"]
        provided = [f for f in fields if attrs.get(f) is not None]

        if 0 < len(provided) < 3:
            missing = [f for f in fields if f not in provided]
            raise serializers.ValidationError(
                {f: ERROR_MESSAGES["field_required"] for f in missing}
            )

        return attrs


class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model.
    """

    contract = ContractSerializer(required=False)
    total_users = serializers.SerializerMethodField(read_only=True)
    plan = serializers.SerializerMethodField(read_only=True)
    custom_plan = CustomPlanSerializer(required=False)

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
            "close_date",
            "editable_after_closing",
            "custom_plan",
            "mf_customer_id",
            "payment_type",
        ]
        read_only_fields = ["is_show_holidays_calendar"]

    def get_plan(self, instance):
        if hasattr(instance, "company_plan"):
            cp = instance.company_plan
            return {
                "id": cp.plan.id,
                "name": cp.plan.name,
                "exchangeable_amount": cp.exchangeable_amount,
                "limit_person": cp.limit_person,
                "monthly_fee": cp.monthly_fee,
                "stripe_price_id": cp.stripe_price_id,
            }
        return {}

    def get_total_users(self, obj):
        return obj.active_users.count()

    def validate(self, attrs):
        """
        Custom validation for update and field range checks.

        Rules:
        1. If the instance already has users:
        - Do not allow updating 'close_date' or 'editable_after_closing'.
        2. Validate:
        - 'close_date' must be between 1 and 31.
        - 'editable_after_closing' must be between 1 and 10.
        """

        # Case 1: Prevent restricted field updates if instance has users
        if instance := self.instance:
            user_count = instance.users.count()
            if user_count > 0:
                if "close_date" in attrs:
                    raise serializers.ValidationError(
                        {"detail": ERROR_MESSAGES["cannot_edit_close_date"]}
                    )

                if "editable_after_closing" in attrs:
                    raise serializers.ValidationError(
                        {"detail": ERROR_MESSAGES["cannot_edit_editable_date"]}
                    )

        # Case 2: Validate numeric ranges
        close_date = attrs.get("close_date")
        editable_after_closing = attrs.get("editable_after_closing")

        if close_date is not None and not (1 <= close_date <= 31):
            raise serializers.ValidationError(
                {"close_date": ERROR_MESSAGES["close_date_range_1_to_31"]}
            )

        if editable_after_closing is not None and not (
            1 <= editable_after_closing <= 10
        ):
            raise serializers.ValidationError(
                {
                    "editable_after_closing": ERROR_MESSAGES[
                        "editable_range_1_to_10"
                    ]
                }
            )

        return attrs

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
    payment_method = serializers.ChoiceField(choices=PaymentTypes.choices())
    address = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)
    responsible_person_name = serializers.CharField(required=False)
    responsible_person_mail = serializers.EmailField(required=False)
    plan = serializers.SlugRelatedField(
        slug_field="name",
        queryset=Plan.objects.filter(is_custom_plan=False).all(),
        error_messages={
            "does_not_exist": ERROR_MESSAGES["plan_does_not_exists"],
            "invalid": ERROR_MESSAGES["plan_invalid"],
        },
    )
    stripe_payment_method_id = serializers.CharField(required=False)
    industry = serializers.CharField(required=False)
    system_main_purpose = serializers.JSONField(required=False)
    department = serializers.JSONField(required=False)

    def validate(self, attrs):
        stripe_payment_method_id = attrs.get("stripe_payment_method_id", None)
        payment_method = attrs.get("payment_method", None)
        if (
            payment_method == PaymentTypes.CREDIT_CARD.value
            and not stripe_payment_method_id
        ):
            raise serializers.ValidationError(
                {"stripe_payment_method_id": ERROR_MESSAGES["field_required"]}
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
    stripe_subscription_id = serializers.CharField(
        read_only=True, source="company_plan.stripe_subscription_id"
    )

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
            "close_date",
            "editable_after_closing",
            "stripe_subscription_id",
            "mf_customer_id",
            "payment_type",
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
            "stripe_invoice_id",
        ]


class AddCardSerializer(serializers.Serializer):
    """
    Serializer for add card to company
    """

    stripe_payment_method_id = serializers.CharField()
    payment_method = serializers.ChoiceField(choices=PaymentTypes.choices())


class CompanyPaymentMethodSerializer(serializers.ModelSerializer):
    """
    Serializer for set default card to company
    """

    class Meta:
        model = CompanyPaymentMethod
        fields = [
            "id",
            "type",
            "stripe_payment_method_id",
            "is_default",
            "is_retry_failed",
            "brand",
            "last4",
            "exp_month",
            "exp_year",
        ]
