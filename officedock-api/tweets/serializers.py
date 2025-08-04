from rest_framework import serializers

from common.serializers import CreationDataUserSerializer
from tweets.models import Tweet


class TweetSerializer(serializers.ModelSerializer):
    """
    TweetSerializer
    """

    user = CreationDataUserSerializer(read_only=True)

    class Meta:
        model = Tweet
        fields = ["id", "user", "content", "is_system", "created_at"]
        read_only_fields = ["is_system"]
