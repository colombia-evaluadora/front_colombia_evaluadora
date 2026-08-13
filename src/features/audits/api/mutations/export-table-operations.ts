import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/audits/api/types/audit"
import type { TableOperationsQueryRequest } from "@/features/audits/api/types/audit-table"

interface ExportTableOperationsInput {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
  format: ExportFormat
}

function exportTableOperations({
  tableSlug,
  ...body
}: ExportTableOperationsInput): Promise<ExportResult> {
  return api.post(`/audit-tables/${tableSlug}/operations/export-all`, body)
}

interface UseExportTableOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportTableOperations>
}

export function useExportTableOperations({ mutationConfig }: UseExportTableOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportTableOperations,
    ...mutationConfig,
  })
}
