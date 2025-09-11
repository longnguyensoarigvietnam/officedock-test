from base.constants import EnumChoices


class ContractStatus(EnumChoices):
    PENDING_APPROVAL = "申請中"
    ACTIVE_CONTRACT = "契約中"
    PAYMENT_FAILED = "決済失敗"
    SUSPENDED = "利用停止中"
    CANCELLATION_PENDING = "解約予約中"
    CONTRACT_TERMINATED = "解約済"
    TEMPORARY_USAGE = "仮利用"
