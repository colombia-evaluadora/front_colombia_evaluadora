import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSelectedTableOperationsInput {
  tableSlug: string
  ids: string[]
  format: ExportFormat
}

function exportSelectedTableOperations({
  tableSlug,
  ids,
  format,
}: ExportSelectedTableOperationsInput): Promise<ExportResult> {
  // Mismo reporte que "exportar todo" (`export-table-operations.ts`), con
  // `IDS` (CSV de `<lsn>-<seq>`) en vez de los filtros de la pantalla.
  return downloadReport("auditoria-tabla-operaciones", {
    format,
    filters: { SLUG: tableSlug, IDS: ids.join(",") },
  })
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
