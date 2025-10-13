import { ExportType } from "@constants/enums";

// Handle file download from API response
export const handleFileDownload = (
  response: any,
  defaultFileName: string,
  exportType: ExportType = ExportType.CSV
): void => {
  try {
    // Create blob from response data
    const blob = new Blob([response.data], { type: response.data.type });

    // Extract filename from content-disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFileName; // fallback filename

    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (fileNameMatch && fileNameMatch.length === 2) {
        filename = fileNameMatch[1];
      }
    } else {
      // Generate filename with timestamp if no content-disposition
      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      filename = `${defaultFileName}_${timestamp}.${exportType}`;
    }

    // Create and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error('ファイルのダウンロードに失敗しました。');
  }
};