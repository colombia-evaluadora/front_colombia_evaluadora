import { downloadReport } from "@/lib/report-client"
import { toEmployeesQueryFilters } from "@/features/establishment/employees/api/query/use-employees"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportEmployeesInput {
  filters: EmployeesQueryRequest["filters"]
  format: ExportFormat
}

export function exportEmployees(input: ExportEmployeesInput): Promise<ExportResult> {
  // Mismos filtros normalizados que el listado (si no, el bind BIGINT[] da 400).
  return downloadReport("funcionarios", {
    format: input.format,
    filters: toEmployeesQueryFilters(input.filters),
  })
}
