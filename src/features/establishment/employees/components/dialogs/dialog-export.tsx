import { ExportDialog } from "@/components/export-dialog"
import { exportEmployees } from "@/features/establishment/employees/api/mutations/export"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"

interface ExportEmployeesDialogProps {
  filters: EmployeesQueryRequest["filters"]
}

export function ExportEmployeesDialog({ filters }: ExportEmployeesDialogProps) {
  return (
    <ExportDialog
      label="Exportar funcionarios filtrados"
      description="Elige un formato para exportar todos los funcionarios que coincidan con los filtros activos."
      onExport={(format) => exportEmployees({ filters, format })}
    />
  )
}
