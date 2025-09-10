from base.constants import EnumChoices


class ExchangeStatus(EnumChoices):
    OK = "ok"
    NG = "ng"


# Path templates
ACCOUNT_PATH_TEMPLATE = "/account/exid-{user_id}"
ACCOUNT_DEPOSIT_PATH_TEMPLATE = "/account/exid-{user_id}/deposit"
EXCHANGE_OEM_PATH = "/exchange-oem"
CALLBACK_EXCHANGE_PATH = "/exchange"
EXCHANGE_COMPLETE_PATH_TEMPLATE = (
    "/exchange-oem/{withdrawal_product_type}/{withdrawal_product_id}/input"
)
# DotMoney exchange processing endpoint (交換処理)
# This is the callback URL provided to DotMoney, which your system must implement.
DOTMONEY_EXCHANGE_PATH = "/api/v1/system/dotmoney/exchange"
