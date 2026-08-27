import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  ExportFormat,
  ExportResult,
  MatriculaQueryRequest,
} from "@/features/coverage/api/types/matricula"

interface ExportMatriculaInput {
  filters: MatriculaQueryRequest["filters"]
  format: ExportFormat
}

function exportMatricula(input: ExportMatriculaInput): Promise<ExportResult> {
  return api.post("/coverage/matricula/export-all", input)
}

interface UseExportMatriculaOptions {
  mutationConfig?: MutationConfig<typeof exportMatricula>
}

export function useExportMatricula({ mutationConfig }: UseExportMatriculaOptions = {}) {
  return useMutation({
    mutationFn: exportMatricula,
    ...mutationConfig,
  })
}
