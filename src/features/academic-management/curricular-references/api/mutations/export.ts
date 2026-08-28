import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { CurricularReferencesQueryRequest } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

interface ExportResult {
  status: "ok" | "error"
  message: string
}

function exportCurricularReferences(input: {
  filters: CurricularReferencesQueryRequest["filters"]
}): Promise<ExportResult> {
  return api.post("/academic-management/curricular-references/export", input)
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportCurricularReferences>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportCurricularReferences,
    ...mutationConfig,
  })
}
