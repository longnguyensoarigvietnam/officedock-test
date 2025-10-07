from django.utils.timezone import now
from rest_framework import serializers

from base.messages import ERROR_MESSAGES
from common.serializers import CreationDataUserSerializer
from surveys.models import Survey, SurveyAnswer, SurveyQuestion
from surveys.utils import is_open_survey
from roles.constants import Actions, Screens, SelectionResultOptions
from roles.utils import get_permission_for_user


class SurveyQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for survey question
    """

    is_selected = serializers.SerializerMethodField()
    selected_user_count = serializers.SerializerMethodField()

    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "text",
            "order",
            "is_selected",
            "selected_user_count",
        ]

    def get_selected_user_count(self, obj):
        """Get selected user count"""
        return SurveyAnswer.objects.filter(question=obj).count()

    def get_is_selected(self, obj):
        """Get selected current user question"""
        request = self.context.get("request")
        current_user = request.user if hasattr(request, "user") else None
        return bool(
            current_user
            and SurveyAnswer.objects.filter(
                question=obj, respondent=current_user
            ).exists()
        )


class SurveyQuestionDetailSerializer(SurveyQuestionSerializer):
    """
    Serializer for get survey question
    Only the creator can view the details of an open survey.
    """

    class Meta:
        model = SurveyQuestion
        fields = [
            "id",
            "text",
            "order",
            "is_selected",
        ]


class SurveyListSerializer(serializers.ModelSerializer):
    """
    Serializer for survey list
    """

    status = serializers.SerializerMethodField()
    is_answered = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()
    created_by = CreationDataUserSerializer(read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "end_at",
            "status",
            "is_answered",
            "created_at",
            "created_by",
            "actions",
        ]

    def get_actions(self, obj):
        """
        Get unique role permissions for the given object.
        """

        user = self.context.get("request").user
        if (
            SelectionResultOptions.ONLY_DATA_OWN.value
            == get_permission_for_user(
                user,
                f"{Screens.SURVEY_MANAGEMENT.value}_{Actions.DELETE.value}",
            )
            and obj.created_by_id != user.id
        ):
            return {Actions.DELETE.value: False}

        return {Actions.DELETE.value: True}

    def get_status(self, obj):
        """
        Get survey status by comparing end_at with the current time.
        """

        request = self.context.get("request")
        current_user = getattr(request, "user", None)
        is_open = is_open_survey(obj.end_at)
        is_my_survey = bool(
            current_user and obj.created_by_id == current_user.id
        )

        return {
            "open": is_open,
            "closed": not is_open,
            "my_survey": is_my_survey,
        }

    def get_is_answered(self, obj):
        """
        Returns True if the current user has answered this survey, False otherwise.
        """
        request = self.context.get("request")
        current_user = getattr(request, "user", None)

        if not current_user or not current_user.is_authenticated:
            return False

        return obj.answers.filter(respondent=current_user).exists()


class SurveySerializer(SurveyListSerializer):
    """
    Serializer for survey
    """

    question_options = serializers.ListField(
        child=serializers.CharField(),
        required=True,
        write_only=True,
    )
    questions = SurveyQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "end_at",
            "question_options",
            "questions",
            "status",
            "created_at",
            "created_by",
        ]

    def validate_end_at(self, value):
        if value and value <= now():
            raise serializers.ValidationError(
                ERROR_MESSAGES["end_time_in_future"]
            )
        return value


class SurveyDetailSerializer(SurveyListSerializer):
    """
    Serializer for survey detail
    Only the creator can view the details of an open survey.
    """

    questions = SurveyQuestionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Survey
        fields = [
            "id",
            "title",
            "end_at",
            "questions",
            "status",
            "created_at",
            "created_by",
        ]


class UserSelectAnswerSerializer(serializers.ModelSerializer):
    """Serializer for user select answer option"""

    id = serializers.PrimaryKeyRelatedField(
        source="question", queryset=SurveyQuestion.objects.all(), required=True
    )

    class Meta:
        model = Survey
        fields = ["id"]

    def validate_id(self, question):
        survey = self.instance

        # Cannot answer a closed survey
        if not is_open_survey(survey.end_at):
            raise serializers.ValidationError(
                ERROR_MESSAGES["cannot_answer_closed_survey"]
            )

        # Cannot select a question that belongs to another survey
        if (
            question
            and survey
            and not survey.questions.filter(id=question.id).exists()
        ):
            raise serializers.ValidationError(
                ERROR_MESSAGES["permission_denied"]
            )
        return question
