import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/academic-period"

interface ExportSelectedAcademicPeriodsInput {
  ids: string[]
  format: ExportFormat
}

export function exportSelectedAcademicPeriods(
  input: ExportSelectedAcademicPeriodsInput,
): Promise<ExportResult> {
  // Exportar los seleccionados es el mismo reporte con el filtro `ids`.
  // Van a número porque el bind está declarado BIGINT[]: mandarlos como
  // texto lo rechaza el query-service.
  return downloadReport("periodos-academicos", {
    format: input.format,
    filters: { ids: input.ids.map(Number) },
  })
}
