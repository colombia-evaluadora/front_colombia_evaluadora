import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

interface ExportSelectedAreaSubjectsInput {
  ids: number[]
  format: ExportFormat
  /**
   * OBLIGATORIO en la práctica, aunque sea opcional en el tipo.
   *
   * `fn_area_subject_reporte_listar` arranca con
   * `WHERE a.FK_TPERIODO_ACADEMICO = p_fk_periodo`, y en SQL `columna = NULL`
   * nunca es verdadero: sin este dato el reporte sale con CERO filas y el
   * usuario recibe un PDF vacío, sin ningún error que lo explique. El filtro
   * `ids` se aplica DESPUÉS (ver el `WHERE ... = ANY(...)` de V135), así que
   * no alcanza por sí solo para traer las filas.
   */
  academicPeriodId?: number
}

function exportSelectedAreaSubjects(input: ExportSelectedAreaSubjectsInput): Promise<ExportResult> {
  return downloadReport("areas", {
    format: input.format,
    filters: { FK_PERIODO: input.academicPeriodId ?? null, ids: input.ids },
  })
}

interface UseExportSelectedAreaSubjectsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAreaSubjects>
}

export function useExportSelectedAreaSubjects({
  mutationConfig,
}: UseExportSelectedAreaSubjectsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAreaSubjects,
    ...mutationConfig,
  })
}