import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/coverage/api/types/matricula"

interface ExportSelectedMatriculaInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedMatricula(input: ExportSelectedMatriculaInput): Promise<ExportResult> {
  return api.post("/coverage/matricula/export", input)
}

interface UseExportSelectedMatriculaOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedMatricula>
}

export function useExportSelectedMatricula({
  mutationConfig,
}: UseExportSelectedMatriculaOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedMatricula,
    ...mutationConfig,
  })
}
