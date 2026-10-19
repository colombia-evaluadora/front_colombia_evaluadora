import { downloadReport } from "@/lib/report-client"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/grade"

interface ExportSelectedGradesInput {
  ids: number[]
  format: ExportFormat
  /** Sin esto el reporte sale vacío — ver `export-selected-area-subjects.ts`. */
  academicPeriodId?: number
}

export function exportSelectedGrades(input: ExportSelectedGradesInput): Promise<ExportResult> {
  // `ids` son ids de GRADO: el `WHERE` de V135 para este reporte compara
  // contra `grado_id`, así que la fila de cada grupo del grado seleccionado
  // entra al reporte (una fila por grupo, que es lo que muestra la tabla).
  return downloadReport("grados", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}
