import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { EstablishmentsQueryRequest } from "../types/establishment"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportEstablishmentsInput {
  filters: EstablishmentsQueryRequest["filters"]
  format: ExportFormat
}

function exportEstablishments(input: ExportEstablishmentsInput): Promise<ExportResult> {
  return api.post("/establishments/export-all", input)
}

interface UseExportEstablishmentsOptions {
  mutationConfig?: MutationConfig<typeof exportEstablishments>
}

export function useExportEstablishments({ mutationConfig }: UseExportEstablishmentsOptions = {}) {
  return useMutation({
    mutationFn: exportEstablishments,
    ...mutationConfig,
  })
}
