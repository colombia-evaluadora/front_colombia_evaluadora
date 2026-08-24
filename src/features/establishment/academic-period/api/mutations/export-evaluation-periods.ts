import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import { toEvaluationPeriodsFilters } from "@/features/establishment/academic-period/api/query/use-evaluation-periods"
import type { MutationConfig } from "@/lib/react-query"
import type {
  EvaluationPeriodsQueryFilters,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/evaluation-period"

interface ExportEvaluationPeriodsInput {
  filters: EvaluationPeriodsQueryFilters
  format: ExportFormat
  /**
   * Sin esto el reporte traería los periodos de evaluación de TODOS los
   * periodos académicos, mientras la tabla muestra los de uno solo. El
   * listado ya acota por acá; la exportación tiene que acotar igual.
   */
  academicPeriodId?: number
}

function exportEvaluationPeriods(input: ExportEvaluationPeriodsInput): Promise<ExportResult> {
  return downloadReport("periodos-evaluacion", {
    format: input.format,
    filters: toEvaluationPeriodsFilters({
      filters: input.filters,
      sorting: [],
      academicPeriodId: input.academicPeriodId,
    }),
  })
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
