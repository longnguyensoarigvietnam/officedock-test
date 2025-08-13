from django.db import transaction
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from base.apis import BaseAPIViewSet
from surveys.serializers import (
    SurveyDetailSerializer,
    SurveyListSerializer,
    SurveySerializer,
    UserSelectAnswerSerializer,
)
from surveys.models import Survey, SurveyAnswer, SurveyQuestion
from surveys.constants import SurveyFilterTypes
from surveys.utils import is_open_survey


@extend_schema(tags=["System > Surveys"])
class SurveyViewSet(
    BaseAPIViewSet,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
):
    """
    API endpoint for Surveys
    """

    queryset = Survey.objects.order_by("-end_at")
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtering by company
        """
        company_id = self.request.user.company_id
        return super().get_queryset().filter(company_id=company_id)

    def get_serializer_class(self):
        """
        Custom serializer for other actions.
        """
        if self.action == "list":
            return SurveyListSerializer

        return super().get_serializer_class()

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "status", type=str, enum=SurveyFilterTypes.values()
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        Returns a paginated list of surveys, filtered by status if provided.
        Status can be OPEN, CLOSED, or MY_SURVEY.
        """
        queryset = self.get_queryset()
        status = request.query_params.get("status")
        if status:
            match status:
                case SurveyFilterTypes.OPEN.value:
                    queryset = queryset.filter(end_at__gt=now())
                case SurveyFilterTypes.CLOSED.value:
                    queryset = queryset.filter(end_at__lte=now())
                case SurveyFilterTypes.MY_SURVEY.value:
                    queryset = queryset.filter(created_by=request.user)

        return self.response_pagination(request, queryset, self.get_serializer)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieves the details of a survey.
        Only the creator can view the details of an open survey.
        Other users are blocked from viewing open surveys.
        """
        current_user = request.user
        survey = self.get_object()

        if survey.created_by_id != current_user.id and is_open_survey(
            survey.end_at
        ):
            return self.response_ok(
                SurveyDetailSerializer(
                    survey, context={"request": request}
                ).data
            )

        return super().retrieve(request, *args, **kwargs)

    @transaction.atomic()
    def perform_create(self, serializer):
        """
        Handles the creation of a new survey and its associated questions.
        """
        current_user = self.request.user
        validated_data = serializer.validated_data
        question_options = validated_data.pop("question_options", [])
        survey = serializer.save(
            company_id=current_user.company_id, created_by=current_user
        )

        # Create question options
        items_to_create = []
        for index, text in enumerate(question_options):
            items_to_create.append(
                SurveyQuestion(
                    company_id=current_user.company_id,
                    survey=survey,
                    text=text,
                    order=index + 1,
                )
            )

        SurveyQuestion.objects.bulk_create(items_to_create)

    @action(
        methods=["POST"],
        detail=True,
        url_path="answer",
        serializer_class=UserSelectAnswerSerializer,
    )
    def user_select_answer(self, request, pk=None):
        """
        Allows a user to submit or update their answer to a survey question.
        """
        current_user = request.user
        survey = self.get_object()
        serializer = self.get_serializer(survey, data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        question = validated_data.pop("question", None)

        if question:
            SurveyAnswer.objects.update_or_create(
                company_id=current_user.company_id,
                respondent=current_user,
                survey=survey,
                defaults={"question": question},
            )
        return self.response_ok()

    @action(
        methods=["GET"],
        detail=False,
        url_path="unanswered-count",
    )
    def get_unanswered_survey_count(self, request, pk=None):
        """
        Returns the count of surveys that the current user has not answered.
        """
        current_user = request.user
        company_id = current_user.company_id

        # Get all surveys for the company
        all_surveys = Survey.objects.filter(company_id=company_id)

        # Get surveys that the user has already answered
        answered_surveys = Survey.objects.filter(
            company_id=company_id, answers__respondent=current_user
        ).distinct()

        # Calculate unanswered surveys
        unanswered_count = all_surveys.count() - answered_surveys.count()

        return self.response_ok({"count": unanswered_count})
