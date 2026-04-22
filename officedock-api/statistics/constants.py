from base.constants import EnumChoices


class ExportType(EnumChoices):
    """
    Export types
    """

    CSV = "csv"
    XLSX = "xlsx"


class PeriodClassification(EnumChoices):
    """
    Period classification of export
    """

    BASE = "基準期間"
    COMPARISON = "比較期間"
