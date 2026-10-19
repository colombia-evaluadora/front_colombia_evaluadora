import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface ExportSelectedRatingScalesInput {
  ids: number[]
  format: ExportFormat
  /** Sin esto el reporte sale vacío — ver `export-selected-area-subjects.ts`. */
  academicPeriodId?: number
}

export function exportSelectedRatingScales(input: ExportSelectedRatingScalesInput): Promise<ExportResult> {
  // Mismo patrón V69 que el resto: `FK_PERIODO` acota (lo exige
  // `fn_escala_listar`) e `ids` recorta la selección.
  return downloadReport("escalas", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}
