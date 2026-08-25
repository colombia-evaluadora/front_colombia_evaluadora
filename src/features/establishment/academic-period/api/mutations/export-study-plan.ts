import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportStudyPlanInput {
  filters: { academicPeriodId?: number }
  format: ExportFormat
}

function exportStudyPlan(input: ExportStudyPlanInput): Promise<ExportResult> {
  return downloadReport("plan-estudio", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_GRADO: null,
      FK_ASIGNATURA: null,
      FK_ESPECIALIDAD: null,
    },
  })
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
