from rest_framework import serializers

from plans.models import Plan


class PlanSerializer(serializers.ModelSerializer):
    """
    Serializer for PLan model
    """

    class Meta:
        model = Plan
        fields = [
            "id",
            "name",
            "monthly_fee",
            "limit_person",
            "exchangeable_amount",
        ]
