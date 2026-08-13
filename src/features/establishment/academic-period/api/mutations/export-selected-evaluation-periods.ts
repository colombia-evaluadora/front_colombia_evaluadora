import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/academic-period/types/evaluation-period"

interface ExportSelectedEvaluationPeriodsInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedEvaluationPeriods(
  input: ExportSelectedEvaluationPeriodsInput
): Promise<ExportResult> {
  return api.post("/evaluation-periods/export", input)
}

interface UseExportSelectedEvaluationPeriodsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedEvaluationPeriods>
}

export function useExportSelectedEvaluationPeriods({
  mutationConfig,
}: UseExportSelectedEvaluationPeriodsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedEvaluationPeriods,
    ...mutationConfig,
  })
}
