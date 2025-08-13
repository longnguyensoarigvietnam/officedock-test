from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.viewsets import ModelViewSet

from base.apis import BaseAPIViewSet

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
        serializer.save(user=user, company=company)

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
