import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { EmployeesQueryRequest } from "../types/employee"
import type { ExportFormat, ExportResult } from "../types/export"

interface ExportEmployeesInput {
  filters: EmployeesQueryRequest["filters"]
  format: ExportFormat
}

function exportEmployees(input: ExportEmployeesInput): Promise<ExportResult> {
  return api.post("/employees/export-all", input)
}

interface UseExportEmployeesOptions {
  mutationConfig?: MutationConfig<typeof exportEmployees>
}

export function useExportEmployees({ mutationConfig }: UseExportEmployeesOptions = {}) {
  return useMutation({
    mutationFn: exportEmployees,
    ...mutationConfig,
  })
}
