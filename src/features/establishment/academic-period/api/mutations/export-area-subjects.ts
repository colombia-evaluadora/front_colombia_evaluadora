import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

interface ExportAreaSubjectsInput {
  filters: { academicPeriodId?: number }
  format: ExportFormat
}

function exportAreaSubjects(input: ExportAreaSubjectsInput): Promise<ExportResult> {
  return downloadReport("areas", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_AREA: null,
      FK_ASIGNATURA: null,
      FK_ESPECIALIDAD: null,
      INCLUIR_INACTIVOS: false,
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
