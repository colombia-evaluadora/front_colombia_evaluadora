import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  StudyPlanReportFilters,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportStudyPlanInput {
  filters: StudyPlanReportFilters
  format: ExportFormat
}

function exportStudyPlan(input: ExportStudyPlanInput): Promise<ExportResult> {
  return downloadReport("plan-estudio", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_GRADO: input.filters.gradeIds?.length ? input.filters.gradeIds : null,
      FK_ASIGNATURA: input.filters.subjectIds?.length ? input.filters.subjectIds : null,
      FK_ESPECIALIDAD: input.filters.specialtyIds?.length ? input.filters.specialtyIds : null,
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
