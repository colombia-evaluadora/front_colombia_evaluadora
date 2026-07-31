import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportSelectedEmployeesInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedEmployees(input: ExportSelectedEmployeesInput): Promise<ExportResult> {
  return api.post("/employees/export", input)
}

interface UseExportSelectedEmployeesOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedEmployees>
}

export function useExportSelectedEmployees({
  mutationConfig,
}: UseExportSelectedEmployeesOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedEmployees,
    ...mutationConfig,
  })
}
