import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface ExportSelectedRatingScalesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedRatingScales(input: ExportSelectedRatingScalesInput): Promise<ExportResult> {
  // Ver `export-selected-area-subjects.ts`: mismo patrón V69 sobre la fila
  // pendiente `/escalas/reporte` del back.
  return downloadReport("escalas", {
    format: input.format,
    filters: { ids: input.ids },
  })
}

interface UseExportSelectedRatingScalesOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedRatingScales>
}

export function useExportSelectedRatingScales({
  mutationConfig,
}: UseExportSelectedRatingScalesOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedRatingScales,
    ...mutationConfig,
  })
}