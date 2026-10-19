import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface ExportRatingScalesInput {
  filters: { academicPeriodId?: number }
  format: ExportFormat
}

export function exportRatingScales(input: ExportRatingScalesInput): Promise<ExportResult> {
  return downloadReport("escalas", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_NIVEL: null,
      TIPO: null,
    },
  })
}
