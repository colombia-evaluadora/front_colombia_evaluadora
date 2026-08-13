import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportCampusesInput {
  filters: CampusesQueryRequest["filters"]
  format: ExportFormat
}

function exportCampuses(input: ExportCampusesInput): Promise<ExportResult> {
  return api.post("/campuses/export-all", input)
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportCampuses>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportCampuses,
    ...mutationConfig,
  })
}
