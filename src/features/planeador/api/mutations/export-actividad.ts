import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/planeador/api/types/actividad"

function exportActividad({
  id,
  format,
}: {
  id: string
  format: ExportFormat
}): Promise<ExportResult> {
  return api.post(`/eval-col/planeador/actividad/export/${id}`, { format })
}

interface UseExportActividadOptions {
  mutationConfig?: MutationConfig<typeof exportActividad>
}

export function useExportActividad({ mutationConfig }: UseExportActividadOptions = {}) {
  return useMutation({
    mutationFn: exportActividad,
    ...mutationConfig,
  })
}
