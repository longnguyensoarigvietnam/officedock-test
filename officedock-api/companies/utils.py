import datetime

from dateutil.relativedelta import relativedelta


def generate_contract_related_date_base_on_now(issue_date=None):
    """
    Generate contract-related dates based on the company account issue date.
    """
    if issue_date is None:
        issue_date = datetime.datetime.now()
    # Normalize issue_date to midnight
    issue_date = issue_date.replace(hour=0, minute=0, second=0, microsecond=0)
    # 1. Usage month starts at the first day of the month after issue_date
    usage_month = issue_date.replace(day=1) + relativedelta(months=1)

    # 2. Contract start date
    contract_start = usage_month

    # 3. Contract end date:
    #    Add 12 months to the usage month and subtract 1 second
    #    → This gives the last moment of the contract period
    contract_end = (
        usage_month + relativedelta(months=12) - datetime.timedelta(seconds=1)
    )

    # 4. Next renewal date:
    #    The renewal date is set to the first day of the last contract month
    next_renewal_at = contract_end.replace(day=1, hour=0, minute=0, second=0)

    return {
        "start_date": contract_start,
        "end_date": contract_end,
        "next_renewal_at": next_renewal_at,
    }
