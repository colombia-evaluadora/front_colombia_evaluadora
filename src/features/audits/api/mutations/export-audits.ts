import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { AuditsQueryRequest, ExportFormat, ExportResult } from "../types/audit"

interface ExportAuditsInput {
  filters: AuditsQueryRequest["filters"]
  format: ExportFormat
}

function exportAudits(input: ExportAuditsInput): Promise<ExportResult> {
  return api.post("/audits/export-all", input)
}

interface UseExportAuditsOptions {
  mutationConfig?: MutationConfig<typeof exportAudits>
}

export function useExportAudits({
  mutationConfig,
}: UseExportAuditsOptions = {}) {
  return useMutation({
    mutationFn: exportAudits,
    ...mutationConfig,
  })
}
