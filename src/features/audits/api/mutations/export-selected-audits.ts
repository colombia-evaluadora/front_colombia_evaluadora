import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/audits/api/types/audit"

interface ExportSelectedAuditsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedAudits(input: ExportSelectedAuditsInput): Promise<ExportResult> {
  return api.post("/audits/export", input)
}

interface UseExportSelectedAuditsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAudits>
}

export function useExportSelectedAudits({ mutationConfig }: UseExportSelectedAuditsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAudits,
    ...mutationConfig,
  })
}
