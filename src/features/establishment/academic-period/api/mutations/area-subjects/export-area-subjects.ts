import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  AreaSubjectsQueryFilters,
  ExportFormat,
  ExportResult,
} from "../../types/area-subject"

interface ExportAreaSubjectsInput {
  filters: AreaSubjectsQueryFilters
  format: ExportFormat
}

function exportAreaSubjects(
  input: ExportAreaSubjectsInput
): Promise<ExportResult> {
  return api.post("/area-subjects/export-all", input)
}

interface UseExportAreaSubjectsOptions {
  mutationConfig?: MutationConfig<typeof exportAreaSubjects>
}

export function useExportAreaSubjects({
  mutationConfig,
}: UseExportAreaSubjectsOptions = {}) {
  return useMutation({
    mutationFn: exportAreaSubjects,
    ...mutationConfig,
  })
}
