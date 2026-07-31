import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportSelectedEstablishmentsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedEstablishments(input: ExportSelectedEstablishmentsInput): Promise<ExportResult> {
  return api.post("/establishments/export", input)
}

interface UseExportSelectedEstablishmentsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedEstablishments>
}

export function useExportSelectedEstablishments({
  mutationConfig,
}: UseExportSelectedEstablishmentsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedEstablishments,
    ...mutationConfig,
  })
}
