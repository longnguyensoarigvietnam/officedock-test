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


class Department(EnumChoices):
    ALL = "全部門利用"
    ADMINISTRATION = "事務部門"
    HR = "人事労務部門"
    ACCOUNTING = "会計部門"
    PLANNING_PRODUCTION = "企画制作部門"
    MARKETING = "マーケティング部門"
    SALES = "営業部門"
    OTHER = "その他（自由記述）"


class SystemMainPurpose(EnumChoices):
    VISUALIZATION_EFFICIENCY = "業務の「見える化」と「効率化」"
    HR_DEVELOPMENT_SKILL_MAP = "人材育成とスキルマップ"
    MOTIVATION = "従業員のモチベーション向上"
    STRATEGIC_MANAGEMENT = "数値に基づいた戦略的経営判断"


class Industry(EnumChoices):
    IT_INTERNET = "IT・インターネット"
    FOOD_HOSPITALITY = "飲食・宿泊"
    HUMAN_RESOURCES = "人材・派遣"
    MEDICAL_WELFARE = "医療・福祉"
    WHOLESALE_RETAIL = "卸売・小売"
    LEISURE = "レジャー"
    EDUCATION = "教育"
    CONSTRUCTION_REAL_ESTATE = "建設・不動産"
    FINANCE_INSURANCE = "金融・保険"
    MANUFACTURING = "製造業・メーカー"
    TRANSPORT_POSTAL = "運輸・郵便"
    PR_MEDIA = "PR・メディア"
    PLANNING_PRODUCTION = "企画・制作"
    PROFESSIONAL_SERVICES = "士業、専門・技術サービス業"
    OTHER = "その他（自由記述）"
