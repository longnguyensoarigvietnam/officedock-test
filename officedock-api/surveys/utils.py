from datetime import datetime
from django.utils.timezone import now

from surveys.models import UsersViewedSurveys


def is_open_survey(end_at: datetime):
    """Check survey is open"""
    return end_at > now()


def view_survey_result(survey, current_user):
    """Current user view survey result"""

    UsersViewedSurveys.objects.get_or_create(
        company_id=current_user.company_id,
        survey=survey,
        user=current_user,
    )
