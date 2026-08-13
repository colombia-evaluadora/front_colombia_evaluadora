import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  AcademicPeriodsQueryFilters,
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/academic-period"

interface ExportAcademicPeriodsInput {
  filters: AcademicPeriodsQueryFilters
  format: ExportFormat
}

function exportAcademicPeriods(
  input: ExportAcademicPeriodsInput
): Promise<ExportResult> {
  return api.post("/academic-periods/export-all", input)
}

interface UseExportAcademicPeriodsOptions {
  mutationConfig?: MutationConfig<typeof exportAcademicPeriods>
}

export function useExportAcademicPeriods({
  mutationConfig,
}: UseExportAcademicPeriodsOptions = {}) {
  return useMutation({
    mutationFn: exportAcademicPeriods,
    ...mutationConfig,
  })
}
