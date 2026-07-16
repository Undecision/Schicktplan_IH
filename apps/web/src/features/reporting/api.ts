import type { AuswertungFilter, AuswertungResult, ExportFormat } from "@schichtbuch/shared";
import { apiClient } from "@/lib/api-client";

export async function fetchAuswertung(filter: AuswertungFilter): Promise<AuswertungResult> {
  const { data } = await apiClient.get<AuswertungResult>("/reporting/auswertung", {
    params: filter,
  });
  return data;
}

/** Lädt den Export (PDF/Excel) als Blob und startet den Download im Browser. */
export async function exportAuswertung(
  filter: AuswertungFilter,
  format: ExportFormat,
): Promise<void> {
  const response = await apiClient.get<Blob>("/reporting/export", {
    params: { ...filter, format },
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  const ext = format === "xlsx" ? "xlsx" : "pdf";
  link.download = `Auswertung_${filter.typ}_${filter.von}_${filter.bis}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
