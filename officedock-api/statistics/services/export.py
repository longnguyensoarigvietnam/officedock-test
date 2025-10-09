from datetime import datetime
from io import BytesIO, StringIO
from pathlib import Path
import csv

from openpyxl import load_workbook

from statistics.constants import ExportType


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

        # TODO: Write actual data here
        # Example: append data rows from queryset (customize as needed)
        # Assuming each task object has: id, name, status
        # for task in self.queryset:
        #     rows.append([
        #         getattr(task, "id", ""),
        #         getattr(task, "name", ""),
        #         getattr(task, "status", ""),
        #     ])

        # Write CSV to memory
        output = StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerows(rows)

        return output

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
