import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportEmployeesInput {
  filters: EmployeesQueryRequest["filters"]
  format: ExportFormat
}

function exportEmployees(input: ExportEmployeesInput): Promise<ExportResult> {
  return api.post("/employees/export-all", input)
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportEmployees>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportEmployees,
    ...mutationConfig,
  })
}
