import { downloadReport } from "@/lib/report-client"
import { toFuncionariosFilters } from "@/features/establishment/employees/api/query/use-funcionarios"
import type { FuncionariosFilters } from "@/features/establishment/employees/api/types/funcionario"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportEmployeesInput {
  establishmentId: number
  filters: FuncionariosFilters
  format: ExportFormat
}

/** Lo que ve el listado, sin datos protegidos (Reglas 11 y 99). */
export function exportEmployees(input: ExportEmployeesInput): Promise<ExportResult> {
  return downloadReport("funcionarios", {
    format: input.format,
    filters: toFuncionariosFilters(input.establishmentId, input.filters),
  })
}
