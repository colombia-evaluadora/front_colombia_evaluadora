import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSelectedAuditsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedAudits({ ids, format }: ExportSelectedAuditsInput): Promise<ExportResult> {
  // Mismo reporte que "exportar todo" (`export-audits.ts`), pero con `IDS`
  // (CSV de `family_id`) en vez de los filtros de la pantalla — `IDS` tiene
  // prioridad sobre el resto en el reporte real (colección Postman
  // `auditoria-export-pdf-excel`, punto 2).
  return downloadReport("auditoria-sesiones", {
    format,
    filters: { IDS: ids.join(",") },
  })
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
