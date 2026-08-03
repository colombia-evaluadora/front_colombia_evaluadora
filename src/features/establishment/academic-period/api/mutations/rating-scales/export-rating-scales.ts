import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  RatingScalesQueryFilters,
} from "../../types/rating-scales"

interface ExportRatingScalesInput {
  filters: RatingScalesQueryFilters
  format: ExportFormat
}

function exportRatingScales(
  input: ExportRatingScalesInput
): Promise<ExportResult> {
  return api.post("/rating-scales/export-all", input)
}

interface UseExportRatingScalesOptions {
  mutationConfig?: MutationConfig<typeof exportRatingScales>
}

export function useExportRatingScales({
  mutationConfig,
}: UseExportRatingScalesOptions = {}) {
  return useMutation({
    mutationFn: exportRatingScales,
    ...mutationConfig,
  })
}
