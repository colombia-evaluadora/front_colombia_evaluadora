import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportSelectedStudyPlanItemsInput {
  ids: number[]
  format: ExportFormat
  /** Sin esto el reporte sale vacío — ver `export-selected-area-subjects.ts`. */
  academicPeriodId?: number
}

export function exportSelectedStudyPlanItems(
  input: ExportSelectedStudyPlanItemsInput,
): Promise<ExportResult> {
  // `FK_PERIODO` acota (lo exige `fn_plan_reporte_listar`), `ids` recorta la
  // selección — mismo patrón V69 que el resto del módulo.
  return downloadReport("plan-estudio", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}
