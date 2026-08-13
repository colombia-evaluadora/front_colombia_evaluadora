import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/types/academic-period"

interface ExportSelectedAcademicPeriodsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedAcademicPeriods(
  input: ExportSelectedAcademicPeriodsInput
): Promise<ExportResult> {
  return api.post("/academic-periods/export", input)
}

interface UseExportSelectedAcademicPeriodsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAcademicPeriods>
}

export function useExportSelectedAcademicPeriods({
  mutationConfig,
}: UseExportSelectedAcademicPeriodsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAcademicPeriods,
    ...mutationConfig,
  })
}
