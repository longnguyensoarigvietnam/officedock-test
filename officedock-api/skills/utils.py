from datetime import timedelta

from dateutil.relativedelta import relativedelta
from django.db.models import Min
from django.utils import timezone
from django.utils.timezone import now

from roles.constants import SelectionResultOptions
from skills.constants import LookBackTypes, SkillStep, SkillLevel
from skills.models import Skill
from users.models import RoleDetail


def get_lookback_time(
    lookback_type,
    lookback_interval,
    user_organization=None,
    start_lookback_at=now(),
):
    """
    Return look back time based on lookback_type.
    """
    if not lookback_type and not lookback_interval:
        return None, now()

    start_lookback_at = (
        user_organization.created_at if user_organization else now()
    )

    match lookback_type:
        case LookBackTypes.DAY.value:
            next_submit_at = start_lookback_at + timedelta(
                days=lookback_interval
            )
        case LookBackTypes.WEEK.value:
            next_submit_at = start_lookback_at + timedelta(
                weeks=lookback_interval
            )
        case LookBackTypes.MONTH.value:
            next_submit_at = start_lookback_at + relativedelta(
                months=lookback_interval
            )
        case LookBackTypes.YEAR.value:
            next_submit_at = start_lookback_at + relativedelta(
                years=lookback_interval
            )
        case _:
            next_submit_at = start_lookback_at

    return next_submit_at, start_lookback_at


def get_list_org_hierarchies(user, permission_name):
    """
    Return list org hierarchies.
    """
    # Retrieve the role permission
    role_permissions = RoleDetail.objects.filter(
        role__users=user, permission__name=permission_name
    ).all()
    organizations = user.organizations.all()
    if role_permissions:
        selection_results = [item.selection_result for item in role_permissions]
        if SelectionResultOptions.ALLOWED.value in selection_results:
            organizations = user.company.organizations.annotate(
                min_skill=Min("skills__id")
            ).order_by(  # or skills__id
                "min_skill"
            )
        elif (
            SelectionResultOptions.ONLY_DATA_ORGANIZATION.value
            in selection_results
        ):
            org_ids = user.organizations.values_list("id", flat=True)

            # Handle get hierarchy
            def _get_children(instance):
                children = instance.organizations.all()
                for child in children:
                    org_ids.append(child.id)
                    _get_children(child)

            _get_children(user)
            org_ids = set(org_ids)
            organizations = organizations.filter(id__in=org_ids)

    return organizations


def get_next_progression(current_step, current_level, skill=None):
    """Returns the next (step, level) progression based on current step and level."""
    has_next_step = True
    steps = list(SkillStep)
    levels = list(SkillLevel)
    try:
        current_level_index = levels.index(SkillLevel(current_level))
        current_step_index = steps.index(SkillStep(current_step))
    except ValueError:
        return None  # Invalid input

    if current_level_index < len(levels) - 1:
        # Move to next level in same step
        return (
            steps[current_step_index].value,
            levels[current_level_index + 1].value,
            has_next_step,
        )
    else:
        if skill:
            exists_next_skill = Skill.objects.filter(parent_id=skill.id).first()
            # If not exists next step, replace next step is current step
            if not exists_next_skill:
                has_next_step = False
                return current_step, current_level, has_next_step
        # Move to LEVEL_1 in next step, if exists
        if current_step_index < len(steps) - 1:
            return (
                steps[current_step_index + 1].value,
                SkillLevel.LEVEL_1.value,
                has_next_step,
            )
        else:
            # Already at final step and final level
            return (
                steps[current_step_index].value,
                levels[current_level_index].value,
                has_next_step,
            )


def handle_continue_progress_lookback(skill_map_skill_level, deleted_at):
    """
    Adjust lookback and next submit times when restoring a skill.
    """
    today = now()
    # Ensure datetimes are comparable
    if timezone.is_naive(today) != timezone.is_naive(deleted_at):
        deleted_at = timezone.make_aware(
            deleted_at, timezone.get_current_timezone()
        )

    date_change = today - deleted_at

    # Prevent accidental negative shifts (shouldn't happen, but safe)
    if date_change.total_seconds() < 0:
        return

    if skill_map_skill_level.start_lookback_at:
        skill_map_skill_level.start_lookback_at += date_change

    if skill_map_skill_level.next_submit_at:
        skill_map_skill_level.next_submit_at += date_change

    skill_map_skill_level.save(
        update_fields=[
            "start_lookback_at",
            "next_submit_at",
        ]
    )
