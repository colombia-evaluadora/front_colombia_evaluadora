import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/audits/api/types/audit"

interface ExportSelectedTableOperationsInput {
  tableSlug: string
  ids: string[]
  format: ExportFormat
}

function exportSelectedTableOperations({
  tableSlug,
  ...body
}: ExportSelectedTableOperationsInput): Promise<ExportResult> {
  return api.post(`/audit-tables/${tableSlug}/operations/export`, body)
}

interface UseExportSelectedTableOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedTableOperations>
}

export function useExportSelectedTableOperations({
  mutationConfig,
}: UseExportSelectedTableOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedTableOperations,
    ...mutationConfig,
  })
}
