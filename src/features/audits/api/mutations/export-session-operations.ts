import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/audits/api/types/audit"

interface ExportSessionOperationsInput {
  sessionId: string
  ids: string[]
  format: ExportFormat
}

// Exporta el set seleccionado de operaciones de una sesión. Como el sheet
// no tiene filtros, el "export all" es simplemente pasar todos los ids.
function exportSessionOperations({
  sessionId,
  ...body
}: ExportSessionOperationsInput): Promise<ExportResult> {
  return api.post(`/audits/sessions/${sessionId}/operations/export`, body)
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
