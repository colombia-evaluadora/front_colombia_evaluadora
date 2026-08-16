import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
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
  return api.post("/rating-scales/export", input)
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
