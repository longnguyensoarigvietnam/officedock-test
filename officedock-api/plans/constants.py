LIMIT_PERSON_PLAN_1_10 = 10
LIMIT_PERSON_PLAN_11_20 = 20
LIMIT_PERSON_PLAN_21_30 = 30
MAX_LIMIT_PERSON = 300
MIN_MONTHLY_FEE = 3000
MAX_MONTHLY_FEE = 1000000
MIN_EXCHANGEABLE_AMOUNT = 300
MAX_EXCHANGEABLE_AMOUNT = 100000
CUSTOM_PLAN = "カスタムプラン"
PLANS = [
    {
        "name": "1-10人プラン",
        "monthly_fee": 29000,  # Monthly fee (JPY)
        "exchangeable_amount": 3000,  # Amount convertible to DotMoney
        "limit_person": LIMIT_PERSON_PLAN_1_10,
    },
    {
        "name": "11-20人プラン",
        "monthly_fee": 58000,
        "exchangeable_amount": 6000,
        "limit_person": LIMIT_PERSON_PLAN_11_20,
    },
    {
        "name": "21-30人プラン",
        "monthly_fee": 78000,
        "exchangeable_amount": 10000,
        "limit_person": LIMIT_PERSON_PLAN_21_30,
    },
]

CONSUMPTION_TAX = "消費税"
TAX_PERCENTAGE = "10.0"
POSTPAID = "後払い利用料"
