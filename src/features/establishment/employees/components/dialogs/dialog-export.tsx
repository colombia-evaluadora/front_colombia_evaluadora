import { ExportDialog } from "@/components/export-dialog"
import { exportEmployees } from "@/features/establishment/employees/api/mutations/export"
import type { FuncionariosFilters } from "@/features/establishment/employees/api/types/funcionario"

interface ExportEmployeesDialogProps {
  establishmentId: number
  filters: FuncionariosFilters
}

export function ExportEmployeesDialog({ establishmentId, filters }: ExportEmployeesDialogProps) {
  return (
    <ExportDialog
      label="Exportar funcionarios"
      description="Elige un formato para exportar los funcionarios que coincidan con la búsqueda y los filtros aplicados."
      onExport={(format) => exportEmployees({ establishmentId, filters, format })}
    />
  )
}
