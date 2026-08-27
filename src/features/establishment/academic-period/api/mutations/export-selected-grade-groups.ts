import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface ExportSelectedGradeGroupsInput {
  ids: number[]
  format: ExportFormat
  /** Sin esto el reporte sale vacío — ver `export-selected-area-subjects.ts`. */
  academicPeriodId?: number
}

function exportSelectedGradeGroups(
  input: ExportSelectedGradeGroupsInput,
): Promise<ExportResult> {
  // Esta pantalla tilda GRUPOS, no grados, así que no puede reusar el filtro
  // `ids` del reporte de grados (que compara contra `grado_id`): mandar ids
  // de grupo ahí no matchea ninguna fila y el archivo sale vacío. Por eso el
  // bind propio `GRUPO_IDS`, que V135 compara contra `grupo_id`.
  //
  // El reporte es el mismo (`grados` → fn_grado_grupo_reporte_listar): ya
  // devuelve una fila por (grado, grupo) con director, jornada y plan, que es
  // exactamente lo que muestra esta tabla.
  return downloadReport("grados", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, GRUPO_IDS: input.ids },
  })
}

interface UseExportSelectedGradeGroupsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedGradeGroups>
}

export function useExportSelectedGradeGroups({
  mutationConfig,
}: UseExportSelectedGradeGroupsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedGradeGroups,
    ...mutationConfig,
  })
}