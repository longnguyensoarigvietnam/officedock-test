import calendar
import datetime

from django.utils.timezone import now


def generate_contract_related_date_base_on_now(issue_date=now()):
    """
    Generate contract-related dates based on the company account issue date.
    """
    # 1. Official usage month: the month immediately after the issue month
    if issue_date.month == 12:
        start_year = issue_date.year + 1
        start_month = 1
    else:
        start_year = issue_date.year
        start_month = issue_date.month + 1
    usage_month = datetime.datetime(
        start_year, start_month, 1, 0, 0, 0
    )  # Use datetime instead of date, default to midnight

    # 2. Contract period: one year starting from the usage_month
    #    → starts at the 1st day of usage_month
    #    → ends at the last day of the previous month in the following year
    contract_start = usage_month
    contract_end_year = (
        contract_start.year + 1
        if contract_start.month != 1
        else contract_start.year + 1
    )
    contract_end_month = (
        contract_start.month - 1 if contract_start.month != 1 else 12
    )
    last_day_of_end_month = calendar.monthrange(
        contract_end_year, contract_end_month
    )[1]
    contract_end = datetime.datetime(
        contract_end_year, contract_end_month, last_day_of_end_month, 23, 59, 59
    )
    next_renewal_at = datetime.datetime(
        contract_end_year, contract_end_month, 1, 0, 0, 0
    )

    return {
        "start_date": contract_start,
        "end_date": contract_end,
        "next_renewal_at": next_renewal_at,
    }
