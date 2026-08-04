import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../../types/area-subject"

interface ExportSelectedAreaSubjectsInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedAreaSubjects(
  input: ExportSelectedAreaSubjectsInput
): Promise<ExportResult> {
  return api.post("/area-subjects/export", input)
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
