from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path
import csv

from openpyxl import load_workbook

from users.models import User
from statistics.constants import ExportType, PeriodClassification
from tags.models import Tag
from skills.models import StatisticCategory


class ExportTaskService:
    """
    Service for exporting task statistics to CSV or Excel files.

    This class loads a predefined template, fills or processes it (if needed),
    and then returns the resulting file as an in-memory object for download.
    """

    XLSX_TEMPLATE_PATH = "templates/export/tasks.xlsx"
    CSV_TEMPLATE_PATH = "templates/export/tasks.csv"

    def __init__(self, request, queryset, export_type):
        """
        Initialize the export service.

        Args:
            request: Django request object.
            queryset: The queryset of task records to be exported.
            export_type: File format for export (CSV or XLSX).
        """
        self.request = request
        self.queryset = queryset
        self.export_type = export_type

    def get_filename(self):
        """
        Generate a timestamped filename for the exported file.
        Example output:
            - 20250810タスク一覧集計.csv
            - 20250810タスク一覧集計.xlsx
        """
        timestamp = datetime.now().strftime("%Y%m%d")
        return f"{timestamp}タスク一覧集計.{self.export_type}"

    def export_task_statistic(self):
        """
        Export task statistics based on the chosen file format.
        Returns:
            BytesIO: File-like object containing the exported data.
        """
        if self.export_type == ExportType.CSV.value:
            return self._export_csv()
        elif self.export_type == ExportType.XLSX.value:
            return self._export_excel()
        else:
            raise ValueError(f"Unsupported export type: {self.export_type}")

    def _export_csv(self):
        """
        Export data using a CSV template.
        The template provides the header row and structure.
        """
        template_path = Path(self.CSV_TEMPLATE_PATH)

        # Load the CSV template header
        with open(template_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            rows = list(reader)

        # Extract query params (outside loop for efficiency)
        from_date = self.request.query_params.get("from_date")
        end_date = self.request.query_params.get("end_date")
        large_category_id = self.request.query_params.get("large_category_id")
        medium_category_id = self.request.query_params.get("medium_category_id")
        small_category_id = self.request.query_params.get("small_category_id")
        tag_ids = [
            t
            for t in self.request.query_params.get("tag_ids", "").split(",")
            if t
        ]

        # Get user name
        user_id = self.request.query_params.get("user_id")
        user = self.request.user
        if user_id:
            user = User.objects.filter(id=user_id).first()
        full_name = getattr(user, "full_name", "")

        # Period classification
        period = self.request.query_params.get("period_classification")
        period_classification = (
            PeriodClassification.COMPARISON.value
            if period == PeriodClassification.COMPARISON.name
            else PeriodClassification.BASE.value
        )

        # ----------------------------------------------------------------
        # Pre-fetch tag filter names (query only once)
        # ----------------------------------------------------------------
        tag_names_filter = ""
        if tag_ids:
            tag_names = Tag.objects.filter(id__in=tag_ids).values_list(
                "name", flat=True
            )
            tag_names_filter = " ".join(f"#{name}" for name in tag_names)

        # ----------------------------------------------------------------
        # Pre-fetch category names (query only once)
        # ----------------------------------------------------------------
        category_ids = [
            cid
            for cid in [
                large_category_id,
                medium_category_id,
                small_category_id,
            ]
            if cid
        ]
        category_map = {}
        if category_ids:
            categories = StatisticCategory.objects.filter(
                id__in=category_ids
            ).values_list("id", "name")
            category_map = {str(cid): cname for cid, cname in categories}

        large_category_name = category_map.get(str(large_category_id), "-")
        medium_category_name = category_map.get(str(medium_category_id), "-")
        small_category_name = category_map.get(str(small_category_id), "-")

        # ----------------------------------------------------------------
        # Build CSV rows
        # ----------------------------------------------------------------
        for idx, task in enumerate(self.queryset, 1):
            # Extract data from task dict
            title = task.get("title", "")
            total_duration = task.get("total_duration", "00:00")
            percent = int(task.get("percent", 0)) / 100

            # Organization
            org = task.get("organization", {})
            organization_name = (
                org.get("name", "") if isinstance(org, dict) else ""
            )

            # Categories (list of dicts)
            large_name = medium_name = small_name = ""
            categories = task.get("categories", [])
            if isinstance(categories, list):
                for c in categories:
                    ctype = c.get("type")
                    if ctype == "LARGE":
                        large_name = c.get("name", "")
                    elif ctype == "MEDIUM":
                        medium_name = c.get("name", "")
                    elif ctype == "SMALL":
                        small_name = c.get("name", "")

            # Tags (list of dicts or strings)
            tags = task.get("tags", [])
            tag_names = ""
            if isinstance(tags, list):
                for t in tags:
                    if isinstance(t, dict):
                        tag_names += f"#{t.get('name', '')} "

            # Append CSV row
            rows.append(
                [
                    from_date,
                    end_date,
                    period_classification,
                    full_name,
                    f"{large_category_name} > {medium_category_name} > {small_category_name}",
                    tag_names_filter,
                    idx,
                    title,
                    total_duration,
                    percent,
                    organization_name,
                    large_name,
                    medium_name,
                    small_name,
                    tag_names.strip(),
                ]
            )

        # Write CSV to memory
        output = StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerows(rows)

        csv_bytes = ("\ufeff" + output.getvalue()).encode("utf-8")

        return BytesIO(csv_bytes)

    def _export_excel(self):
        """
        Export data using an Excel (.xlsx) template.
        """
        template_path = Path(self.XLSX_TEMPLATE_PATH)
        wb = load_workbook(template_path)
        wb.active

        # TODO: Write actual data here
        # Example: write data starting from row 2
        # row_index = 2
        # for task in self.queryset:
        #     ws.cell(row=row_index, column=1, value=getattr(task, "id", ""))
        #     ws.cell(row=row_index, column=2, value=getattr(task, "name", ""))
        #     ws.cell(row=row_index, column=3, value=getattr(task, "status", ""))
        #     row_index += 1

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return excel_file
