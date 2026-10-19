import { downloadReport } from "@/lib/report-client"
import { toAcademicPeriodsFilters } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import type {
  AcademicPeriodsQueryFilters,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/academic-period"

interface ExportAcademicPeriodsInput {
  filters: AcademicPeriodsQueryFilters
  format: ExportFormat
}

export function exportAcademicPeriods(input: ExportAcademicPeriodsInput): Promise<ExportResult> {
  // Los MISMOS filtros que manda la tabla: `toAcademicPeriodsFilters` es la
  // conversión que usa el listado, así que el reporte no puede filtrar
  // distinto de lo que el usuario está viendo.
  return downloadReport("periodos-academicos", {
    format: input.format,
    filters: toAcademicPeriodsFilters({ filters: input.filters, sorting: [] }),
  })
}
