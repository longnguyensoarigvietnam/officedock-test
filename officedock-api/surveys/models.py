from django.db import models

from base.models import BaseModel
from companies.models import Company
from users.models import User


class Survey(BaseModel):
    """Survey model"""

    title = models.TextField()
    end_at = models.DateTimeField()
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, related_name="surveys"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_surveys",
    )


class SurveyQuestion(BaseModel):
    """Survey questions model"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="questions"
    )
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="questions"
    )
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)


class SurveyAnswer(BaseModel):
    """User answer survey model"""

    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name="answers"
    )
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        SurveyQuestion, on_delete=models.CASCADE, related_name="answers"
    )
    respondent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="survey_answers",
    )
