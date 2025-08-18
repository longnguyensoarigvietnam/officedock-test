from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.viewsets import ModelViewSet

from base.apis import BaseAPIViewSet
from base.paginations import CustomCursorPagination

from tweets.models import Tweet
from tweets.serializers import TweetSerializer


@extend_schema(tags=["System > Tweet"])
class TweetsView(BaseAPIViewSet, ModelViewSet):
    """
    API endpoint that allows tweet to be viewed or edited.
    """

    queryset = Tweet.objects.all()
    serializer_class = TweetSerializer
    pagination_class = CustomCursorPagination
    ordering = "-created_at"

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
        )

    def perform_create(self, serializer):
        """
        Handle create tweet
        """
        user = self.request.user
        company = user.company
        serializer.save(user=user, company=company)

    @extend_schema(
        parameters=[
            OpenApiParameter("ordering", type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Handle get list tweet pagination with scroll
        """
        return super().list(request, *args, **kwargs)
