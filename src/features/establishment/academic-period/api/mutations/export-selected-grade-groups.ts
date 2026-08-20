import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/grade-group"

interface ExportSelectedGradeGroupsInput {
  ids: number[]
  format: ExportFormat
}

// Sin endpoint real en el contrato todavía — mismo caso que
// escalas/grados/área-asignatura (ver comentario en `area-subject.ts` de los
// mocks): el export no tiene función en el backend, solo el stub del front.
function exportSelectedGradeGroups(
  input: ExportSelectedGradeGroupsInput,
): Promise<ExportResult> {
  return api.post("/grade-groups/export", input)
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
