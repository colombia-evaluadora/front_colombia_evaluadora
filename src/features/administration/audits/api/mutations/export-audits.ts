import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import { toAuditoriaSesionesReportFilters } from "@/features/administration/audits/api/real-mapping"
import type { AuditsQueryRequest, ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportAuditsInput {
  filters: AuditsQueryRequest["filters"]
  format: ExportFormat
}

function exportAudits({ filters, format }: ExportAuditsInput): Promise<ExportResult> {
  // `POST /reportes/auditoria-sesiones` (colección Postman
  // `auditoria-export-pdf-excel`, V405) — reemplaza al `/audits/export-all`
  // que solo existía en el mock.
  return downloadReport("auditoria-sesiones", {
    format,
    filters: toAuditoriaSesionesReportFilters(filters),
  })
}

interface UseExportAuditsOptions {
  mutationConfig?: MutationConfig<typeof exportAudits>
}

export function useExportAudits({ mutationConfig }: UseExportAuditsOptions = {}) {
  return useMutation({
    mutationFn: exportAudits,
    ...mutationConfig,
  })
}
