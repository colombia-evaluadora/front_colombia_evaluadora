import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportEstablishmentsInput {
  filters: EstablishmentsQueryRequest["filters"]
  format: ExportFormat
}

function exportEstablishments(input: ExportEstablishmentsInput): Promise<ExportResult> {
  return api.post("/establishments/export-all", input)
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportEstablishments>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportEstablishments,
    ...mutationConfig,
  })
}
