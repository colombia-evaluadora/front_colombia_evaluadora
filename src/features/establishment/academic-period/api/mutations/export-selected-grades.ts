import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/grade"

interface ExportSelectedGradesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedGrades(input: ExportSelectedGradesInput): Promise<ExportResult> {
  // Ver `export-selected-area-subjects.ts`: la fila pendiente
  // `/grados/reporte` del back (con `BODY.FILTERS.IDS`) acepta la lista de
  // ids y filtra DESPUES del gate de autorizacion.
  return downloadReport("grados", {
    format: input.format,
    filters: { ids: input.ids },
  })
}

interface UseExportSelectedGradesOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedGrades>
}

export function useExportSelectedGrades({ mutationConfig }: UseExportSelectedGradesOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedGrades,
    ...mutationConfig,
  })
}