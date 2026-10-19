import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedCampusesInput {
  ids: number[]
  format: ExportFormat
}

export function exportSelectedCampuses(input: ExportSelectedCampusesInput): Promise<ExportResult> {
  // Mismo reporte con filtro `ids`; el SQL lo aplica tras el gate de permisos.
  return downloadReport("sedes", { format: input.format, filters: { ids: input.ids } })
}
