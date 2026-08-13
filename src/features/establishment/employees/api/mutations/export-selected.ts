import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedEmployeesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedEmployees(input: ExportSelectedEmployeesInput): Promise<ExportResult> {
  return api.post("/employees/export", input)
}

interface UseExportSelectedOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedEmployees>
}

export function useExportSelected({
  mutationConfig,
}: UseExportSelectedOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedEmployees,
    ...mutationConfig,
  })
}
