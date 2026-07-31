import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportSelectedCampusesInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedCampuses(input: ExportSelectedCampusesInput): Promise<ExportResult> {
  return api.post("/campuses/export", input)
}

interface UseExportSelectedCampusesOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedCampuses>
}

export function useExportSelectedCampuses({
  mutationConfig,
}: UseExportSelectedCampusesOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedCampuses,
    ...mutationConfig,
  })
}
