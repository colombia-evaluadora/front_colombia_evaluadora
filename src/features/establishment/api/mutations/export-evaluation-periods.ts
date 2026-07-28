import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  EvaluationPeriodsQueryFilters,
  ExportFormat,
  ExportResult,
} from "../types/academic-period/evaluation-period"

interface ExportEvaluationPeriodsInput {
  filters: EvaluationPeriodsQueryFilters
  format: ExportFormat
}

function exportEvaluationPeriods(
  input: ExportEvaluationPeriodsInput
): Promise<ExportResult> {
  return api.post("/evaluation-periods/export-all", input)
}

interface UseExportEvaluationPeriodsOptions {
  mutationConfig?: MutationConfig<typeof exportEvaluationPeriods>
}

export function useExportEvaluationPeriods({
  mutationConfig,
}: UseExportEvaluationPeriodsOptions = {}) {
  return useMutation({
    mutationFn: exportEvaluationPeriods,
    ...mutationConfig,
  })
}
