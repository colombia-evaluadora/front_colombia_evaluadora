import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSessionOperationsInput {
  sessionId: string
  ids: string[]
  format: ExportFormat
}

// Exporta el set seleccionado de operaciones de una sesión. Como el sheet
// no tiene filtros, el "export all" es simplemente pasar todos los ids.
function exportSessionOperations({
  sessionId,
  ids,
  format,
}: ExportSessionOperationsInput): Promise<ExportResult> {
  // `POST /reportes/auditoria-sesion-operaciones` (colección Postman
  // `auditoria-export-pdf-excel`, V405) — `SESSIONID` es obligatorio y va
  // en el body: sin él el reporte sale vacío, igual que `SLUG` en
  // `auditoria-tabla-operaciones`.
  return downloadReport("auditoria-sesion-operaciones", {
    format,
    filters: { SESSIONID: sessionId, IDS: ids.join(",") },
  })
}

interface UseExportSessionOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportSessionOperations>
}

export function useExportSessionOperations({
  mutationConfig,
}: UseExportSessionOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportSessionOperations,
    ...mutationConfig,
  })
}
