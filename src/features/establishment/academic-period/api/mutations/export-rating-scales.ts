import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/rating-scales"

interface ExportRatingScalesInput {
  filters: { academicPeriodId?: number }
  format: ExportFormat
}

function exportRatingScales(input: ExportRatingScalesInput): Promise<ExportResult> {
  return downloadReport("escalas", {
    format: input.format,
    filters: {
      FK_PERIODO: input.filters.academicPeriodId ?? null,
      FK_NIVEL: null,
      TIPO: null,
    },
  })
}

interface UseExportRatingScalesOptions {
  mutationConfig?: MutationConfig<typeof exportRatingScales>
}

export function useExportRatingScales({ mutationConfig }: UseExportRatingScalesOptions = {}) {
  return useMutation({
    mutationFn: exportRatingScales,
    ...mutationConfig,
  })
}
