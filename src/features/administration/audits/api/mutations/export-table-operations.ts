import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import { toAuditoriaTablaOperacionesReportFilters } from "@/features/administration/audits/api/real-mapping"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"
import type { TableOperationsQueryRequest } from "@/features/administration/audits/api/types/audit-table"

interface ExportTableOperationsInput {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
  format: ExportFormat
}

function exportTableOperations({
  tableSlug,
  filters,
  format,
}: ExportTableOperationsInput): Promise<ExportResult> {
  // `POST /reportes/auditoria-tabla-operaciones` (colección Postman
  // `auditoria-export-pdf-excel`, V405) — `SLUG` es obligatorio y va en el
  // body, no en la ruta (a diferencia del listado real,
  // `/audit-tables/:SLUG/operations/query`): sin él el reporte sale vacío.
  return downloadReport("auditoria-tabla-operaciones", {
    format,
    filters: toAuditoriaTablaOperacionesReportFilters(tableSlug, filters),
  })
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
