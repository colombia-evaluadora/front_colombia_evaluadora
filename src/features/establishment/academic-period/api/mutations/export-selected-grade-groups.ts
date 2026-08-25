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
}

function exportSelectedGradeGroups(
  input: ExportSelectedGradeGroupsInput,
): Promise<ExportResult> {
  // El front todavía no llama a esta clave (`asignaciones` reusa la misma
  // ruta que el reporte de periodos académicos — ver el dialog que llama a
  // `useExportAcademicAssignmentReport`). Queda alineado con el resto por
  // consistencia: misma forma, misma clave que el `export-all`.
  return downloadReport("asignaciones", {
    format: input.format,
    filters: { ids: input.ids },
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