from datetime import timedelta

from dateutil.relativedelta import relativedelta
from django.db.models import Min
from django.utils.timezone import now

from roles.constants import SelectionResultOptions
from skills.constants import LookBackTypes
from users.models import RoleDetail


def get_lookback_time(lookback_type, lookback_interval):
    """
    Return look back time based on lookback_type.
    """
    match lookback_type:
        case LookBackTypes.DAY.value:
            next_submit_at = now() + timedelta(days=lookback_interval)
        case LookBackTypes.WEEK.value:
            next_submit_at = now() + timedelta(weeks=lookback_interval)
        case LookBackTypes.MONTH.value:
            next_submit_at = now() + relativedelta(months=lookback_interval)
        case LookBackTypes.YEAR.value:
            next_submit_at = now() + relativedelta(years=lookback_interval)
        case _:
            next_submit_at = now()

    return next_submit_at


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
