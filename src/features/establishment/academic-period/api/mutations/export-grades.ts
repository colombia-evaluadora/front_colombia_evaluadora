import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  GradesQueryFilters,
} from "@/features/establishment/academic-period/types/grade"

interface ExportGradesInput {
  filters: GradesQueryFilters
  format: ExportFormat
}

function exportGrades(input: ExportGradesInput): Promise<ExportResult> {
  return api.post("/grades/export-all", input)
}

interface UseExportGradesOptions {
  mutationConfig?: MutationConfig<typeof exportGrades>
}

export function useExportGrades({ mutationConfig }: UseExportGradesOptions = {}) {
  return useMutation({
    mutationFn: exportGrades,
    ...mutationConfig,
  })
}
