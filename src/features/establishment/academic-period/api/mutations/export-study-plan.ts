import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  StudyPlanQueryFilters,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportStudyPlanInput {
  filters: StudyPlanQueryFilters
  format: ExportFormat
}

// Sin endpoint real en el contrato todavía — mismo caso que el resto de
// exports del módulo (ver comentario en `export-selected-study-plan-items.ts`).
function exportStudyPlan(input: ExportStudyPlanInput): Promise<ExportResult> {
  return api.post("/study-plan/export-all", input)
}

interface UseExportStudyPlanOptions {
  mutationConfig?: MutationConfig<typeof exportStudyPlan>
}

export function useExportStudyPlan({ mutationConfig }: UseExportStudyPlanOptions = {}) {
  return useMutation({
    mutationFn: exportStudyPlan,
    ...mutationConfig,
  })
}
