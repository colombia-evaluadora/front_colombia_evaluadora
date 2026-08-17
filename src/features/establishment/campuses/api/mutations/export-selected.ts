import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedCampusesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedCampuses(input: ExportSelectedCampusesInput): Promise<ExportResult> {
  return api.post("/campuses/export", input)
}

interface UseExportSelectedOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedCampuses>
}

export function useExportSelected({
  mutationConfig,
}: UseExportSelectedOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedCampuses,
    ...mutationConfig,
  })
}
