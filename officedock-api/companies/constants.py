from base.constants import EnumChoices


class CompanyStatus(EnumChoices):
    PENDING_APPROVAL = "申請中"
    ACTIVE_CONTRACT = "契約中"
    RETRY_PAYMENT = "決済失敗"
    SUSPENDED = "利用停止中"
    CANCELLATION_PENDING = "解約予約中"
    CONTRACT_TERMINATED = "解約済"
    TEMPORARY_USAGE = "仮利用"


class CompanyTransactionTypes(EnumChoices):
    INVOICE = "INVOICE"
    PLAN = "PLAN"
    POINT = "POINT"


class TransactionStatus(EnumChoices):
    PAID = "支払済"
    UNPAID = "未支払"
    PAYMENT_FAILED = "失敗"
    SKIP_PAYMENT = "キャンセル"


class ImplementationMainIssues(EnumChoices):
    OVERTIME_VISIBILITY = "残業の見える化がしたい"
    REDUCE_REPORT_BURDEN = "日報負担を減らしたい"
    VISUALIZE_SKILL_UP = "スキルアップを可視化したい"


class SystemMainPurpose(EnumChoices):
    ATTENDANCE_MANAGEMENT = "勤怠管理"
    BUSINESS_EFFICIENCY = "業務効率化"
    SKILL_DEVELOPMENT = "スキル育成"
    TALENT_EVALUATION = "人材評価"


class Industry(EnumChoices):
    IT = "IT"
    MANUFACTURING = "製造"
    FINANCE = "金融"
    HEALTHCARE = "医療"
    EDUCATION = "教育"
    OTHER = "その他"
