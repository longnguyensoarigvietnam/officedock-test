from base.constants import EnumChoices


class ContractStatus(EnumChoices):
    SIGNED = "締結済み"
    NOT_SIGNED = "未締結"


PLANS = {
    "plan_1_10": {
        "name": "Plan 1-10",
        "monthly_fee": 29000,  # Monthly fee (JPY)
        "exchangeable_amount": 3000,  # Amount convertible to DotMoney
        "max_exchange_per_user": 300,  # Max convertible per user per month
        "min_exchange_per_user": 300,  # Min convertible per user per month
    },
    "plan_11_20": {
        "name": "Plan 11-20",
        "monthly_fee": 58000,
        "exchangeable_amount": 6000,
        "max_exchange_per_user": 545,
        "min_exchange_per_user": 300,
    },
    "plan_21_30": {
        "name": "Plan 21-30",
        "monthly_fee": 78000,
        "exchangeable_amount": 10000,
        "max_exchange_per_user": 476,
        "min_exchange_per_user": 333,
    },
}
