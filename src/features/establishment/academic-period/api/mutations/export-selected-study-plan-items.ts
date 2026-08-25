import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportSelectedStudyPlanItemsInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedStudyPlanItems(
  input: ExportSelectedStudyPlanItemsInput,
): Promise<ExportResult> {
  // Ver `export-selected-area-subjects.ts`: la fila pendiente
  // `/plan-estudio/reporte` del back toma `ids` igual que V69.
  return downloadReport("plan-estudio", {
    format: input.format,
    filters: { ids: input.ids },
  })
}

interface UseExportSelectedStudyPlanItemsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedStudyPlanItems>
}

export function useExportSelectedStudyPlanItems({
  mutationConfig,
}: UseExportSelectedStudyPlanItemsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedStudyPlanItems,
    ...mutationConfig,
  })
}