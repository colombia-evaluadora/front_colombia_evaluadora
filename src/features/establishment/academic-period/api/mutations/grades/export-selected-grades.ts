import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../../types/grade"

interface ExportSelectedGradesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedGrades(
  input: ExportSelectedGradesInput
): Promise<ExportResult> {
  return api.post("/grades/export", input)
}

interface UseExportSelectedGradesOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedGrades>
}

export function useExportSelectedGrades({
  mutationConfig,
}: UseExportSelectedGradesOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedGrades,
    ...mutationConfig,
  })
}
