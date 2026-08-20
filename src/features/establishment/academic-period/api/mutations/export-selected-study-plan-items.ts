import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportSelectedStudyPlanItemsInput {
  ids: number[]
  format: ExportFormat
}

// Sin endpoint real en el contrato todavía — mismo caso que
// escalas/grados/área-asignatura (ver comentario en `area-subject.ts` de los
// mocks): el export no tiene función en el backend, solo el stub del front.
function exportSelectedStudyPlanItems(
  input: ExportSelectedStudyPlanItemsInput,
): Promise<ExportResult> {
  return api.post("/study-plan/export", input)
}

interface UseExportSelectedStudyPlanItemsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedStudyPlanItems>
}

export function useExportSelectedStudyPlanItems({
  mutationConfig,
}: UseExportSelectedStudyPlanItemsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedStudyPlanItems,
    ...mutationConfig,
  })
}
