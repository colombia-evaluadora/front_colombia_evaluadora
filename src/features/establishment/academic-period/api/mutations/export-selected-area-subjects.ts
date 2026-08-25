import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/academic-period/api/types/area-subject"

interface ExportSelectedAreaSubjectsInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedAreaSubjects(input: ExportSelectedAreaSubjectsInput): Promise<ExportResult> {
  return downloadReport("areas", {
    format: input.format,
    filters: { ids: input.ids },
  })
}

interface UseExportSelectedAreaSubjectsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAreaSubjects>
}

export function useExportSelectedAreaSubjects({
  mutationConfig,
}: UseExportSelectedAreaSubjectsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAreaSubjects,
    ...mutationConfig,
  })
}