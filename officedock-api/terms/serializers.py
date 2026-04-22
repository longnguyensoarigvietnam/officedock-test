from django.db.models import Q
from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from terms.constants import TermStatus
from terms.models import Term


class TermSerializer(serializers.ModelSerializer):
    """
    Serializer for the Terms model
    """

    is_confirmed = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Term
        fields = [
            "id",
            "title",
            "description",
            "period_start",
            "period_end",
            "type",
            "status",
            "is_confirmed",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        """
        Validate the data
        """
        instance = self.instance
        title = data.get("title")
        description = data.get("description")
        period_start = data.get("period_start")
        period_end = data.get("period_end", None)
        status = data.get("status")
        term_type = data.get("type")

        term = Term.objects.filter(
            status=TermStatus.PUBLIC.value, type=term_type
        )
        if instance:
            term = term.exclude(pk=instance.pk)

        if period_start and period_end and period_start >= period_end:
            raise serializers.ValidationError(
                {"detail": ERROR_MESSAGES["start_date_end_date_invalid"]}
            )

        if status == TermStatus.PUBLIC.value:
            field = None
            if period_start is None:
                field = "period_start"
            if description is None:
                field = "description"
            if title is None:
                field = "title"
            if field:
                raise serializers.ValidationError(
                    {field: ERROR_MESSAGES["field_required"]}
                )

            if period_start and period_end:
                term = term.filter(
                    # period_start in range from period_start to period_end
                    (
                        Q(period_start__gte=period_start)
                        & Q(period_start__lte=period_end)
                    )
                    |
                    # period_end in range from period_start to period_end
                    (
                        Q(period_end__gte=period_start)
                        & Q(period_end__lte=period_end)
                    )
                    |
                    # Coverage range period_start to period_end
                    (
                        Q(period_start__lte=period_start)
                        & Q(period_end__gte=period_end)
                    )
                    | (
                        Q(period_start__lte=period_start)
                        & Q(period_end__isnull=True)
                    )
                )
            elif period_start and period_end is None:
                term = term.filter(
                    Q(period_end__isnull=True)
                    | Q(period_end__gte=period_start)
                    | Q(period_start__gte=period_start)
                )
            if term.exists():
                raise serializers.ValidationError(
                    {"detail": ERROR_MESSAGES["same_period"]}
                )

        return data

    def update(self, instance, validated_data):
        """
        Handle update term
        """
        period_end = validated_data.get("period_end", None)
        validated_data.pop("type", None)

        # Custom logic for updating period_end based on your conditions
        if (
            instance.status == TermStatus.PUBLIC.value
            and instance.read_terms.exists()
        ):
            instance.period_end = period_end
        else:
            # If no period_end update is needed, proceed with default behavior
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

        # Save the instance
        instance.save()

        # Return the updated instance
        return instance

    def get_is_confirmed(self, instance):
        """
        Check is user confirmed or not term
        """

        return instance.read_terms.exists()
