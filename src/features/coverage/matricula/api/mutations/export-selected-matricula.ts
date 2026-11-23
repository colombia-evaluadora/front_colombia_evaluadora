import { downloadReport } from "@/lib/report-client"
import type { ExportFormat, ExportResult } from "@/features/coverage/matricula/api/types/matricula"

interface ExportSelectedMatriculaInput {
  ids: string[]
  format: ExportFormat
}

/** Mismo reporte `matricula` que la tabla, acotado a las filas seleccionadas (`FILTERS.IDS`). */
export function exportSelectedMatricula(input: ExportSelectedMatriculaInput): Promise<ExportResult> {
  return downloadReport("matricula", {
    format: input.format,
    filters: { IDS: input.ids.map(Number) },
  })
}
