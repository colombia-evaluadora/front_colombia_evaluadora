import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  AreaSubjectReportFilters,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

interface ExportAreaSubjectsInput {
  filters: AreaSubjectReportFilters
  format: ExportFormat
}

function exportAreaSubjects(input: ExportAreaSubjectsInput): Promise<ExportResult> {
  return downloadReport("areas", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_AREA: input.filters.areaIds?.length ? input.filters.areaIds : null,
      FK_ASIGNATURA: input.filters.subjectIds?.length ? input.filters.subjectIds : null,
      FK_ESPECIALIDAD: input.filters.specialtyIds?.length ? input.filters.specialtyIds : null,
      INCLUIR_INACTIVOS: input.filters.includeInactive ?? false,
    },
  })
}

interface UseExportAreaSubjectsOptions {
  mutationConfig?: MutationConfig<typeof exportAreaSubjects>
}

export function useExportAreaSubjects({ mutationConfig }: UseExportAreaSubjectsOptions = {}) {
  return useMutation({
    mutationFn: exportAreaSubjects,
    ...mutationConfig,
  })
}
