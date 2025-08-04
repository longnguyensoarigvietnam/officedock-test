from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.viewsets import ModelViewSet

from base.apis import BaseAPIViewSet
from chat.constants import WebSocketEventType
from common.utils import send_web_socket_event

from tweets.models import Tweet
from tweets.serializers import TweetSerializer


@extend_schema(tags=["System > Tweet"])
class TweetsView(BaseAPIViewSet, ModelViewSet):
    """
    API endpoint that allows tweet to be viewed or edited.
    """

    queryset = Tweet.objects.all()
    serializer_class = TweetSerializer

    def get_queryset(self):
        """
        Get queryset and filter
        """
        return (
            super()
            .get_queryset()
            .filter(
                company_id=self.request.user.company_id,
            )
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        """
        Handle create tweet
        """
        user = self.request.user
        company = user.company
        instance = serializer.save(user=user, company=user.company)
        data = self.get_serializer(instance).data
        for user in company.users.all():
            # Send WebSocket event for real-time updates
            send_web_socket_event(
                {
                    "action": WebSocketEventType.CREATE_TWEET.value,
                    "tweet": data,
                },
                user,
            )

    @extend_schema(parameters=[OpenApiParameter("tweet_id", type=str)])
    def list(self, request, *args, **kwargs):
        """
        Handle get list tweet pagination with scroll
        """
        tweet_id = request.query_params.get("tweet_id")
        tweets = self.get_queryset()
        if tweet_id is not None:
            tweets = tweets.filter(id__lt=tweet_id)
        tweets = tweets.order_by("-created_at")

        # Return the response with the serialized data
        return self.response_pagination(request, tweets, TweetSerializer)
