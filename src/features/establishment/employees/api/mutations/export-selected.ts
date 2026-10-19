import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedEmployeesInput {
  ids: number[]
  format: ExportFormat
}

export function exportSelectedEmployees(input: ExportSelectedEmployeesInput): Promise<ExportResult> {
  // Mismo reporte con filtro `ids`; el SQL lo aplica tras el gate de permisos.
  return downloadReport("funcionarios", { format: input.format, filters: { ids: input.ids } })
}
