import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedEstablishmentsInput {
  ids: number[]
  format: ExportFormat
}

export function exportSelectedEstablishments(input: ExportSelectedEstablishmentsInput): Promise<ExportResult> {
  // Mismo reporte con filtro `ids`; el SQL lo aplica tras el gate de permisos.
  return downloadReport("establecimientos", { format: input.format, filters: { ids: input.ids } })
}
