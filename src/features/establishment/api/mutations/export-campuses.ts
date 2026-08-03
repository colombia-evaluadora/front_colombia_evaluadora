import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CampusesQueryRequest } from "../types/campus"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportCampusesInput {
  filters: CampusesQueryRequest["filters"]
  format: ExportFormat
}

function exportCampuses(input: ExportCampusesInput): Promise<ExportResult> {
  return api.post("/campuses/export-all", input)
}

interface UseExportCampusesOptions {
  mutationConfig?: MutationConfig<typeof exportCampuses>
}

export function useExportCampuses({ mutationConfig }: UseExportCampusesOptions = {}) {
  return useMutation({
    mutationFn: exportCampuses,
    ...mutationConfig,
  })
}
