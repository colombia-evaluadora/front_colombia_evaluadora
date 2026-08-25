import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/academic-period/api/types/grade"

interface ExportGradesInput {
  academicPeriodId?: number
  format: ExportFormat
}

// Reporte combinado "grados y grupos" (`fn_grado_grupo_reporte_listar`,
// V137): un grado por fila, con los grupos y su director/jornada, y el plan
// de estudio del grado. Cruza TODOS los grados del periodo, no solo la
// página que se está viendo en la tabla.
function exportGrades(input: ExportGradesInput): Promise<ExportResult> {
  return downloadReport("grados", {
    format: input.format,
    filters: {
      FK_PERIODO: input.academicPeriodId ?? null,
      FK_GRADO: null,
    },
  })
}

interface UseExportGradesOptions {
  mutationConfig?: MutationConfig<typeof exportGrades>
}

export function useExportGrades({ mutationConfig }: UseExportGradesOptions = {}) {
  return useMutation({
    mutationFn: exportGrades,
    ...mutationConfig,
  })
}
