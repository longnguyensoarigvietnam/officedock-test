from django.db import transaction
from rest_framework import serializers

from companies.models import Company, Contract
from base.messages import ERROR_MESSAGES
from users.models import User


class ContractSerializer(serializers.ModelSerializer):
    """
    Serializer for Contract model.
    """

    class Meta:
        model = Contract
        fields = ["id", "start_date", "end_date", "status"]

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )
        return attrs


class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for Company model.
    """

    contract = ContractSerializer(required=False)
    fullname = serializers.CharField(
        write_only=True, max_length=255, required=False
    )
    email = serializers.CharField(
        write_only=True, max_length=255, required=False
    )

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "contract",
            "fullname",
            "email",
            "is_show_holidays_calendar",
        ]
        read_only_fields = ["is_show_holidays_calendar"]

    def validate_email(self, value):
        """
        Validate unique email for System site.
        """
        User.validate_unique_email(
            instance=self.instance, email=value, is_admin_site=False
        )
        return super().validate(value)

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
