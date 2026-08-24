import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

interface ExportSelectedEvaluationPeriodsInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedEvaluationPeriods(
  input: ExportSelectedEvaluationPeriodsInput,
): Promise<ExportResult> {
  // El filtro `ids` alcanza: identifica filas concretas, así que no hace
  // falta acotar además por periodo académico.
  return downloadReport("periodos-evaluacion", {
    format: input.format,
    filters: { ids: input.ids },
  })
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
