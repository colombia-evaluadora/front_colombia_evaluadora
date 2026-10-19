import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedEmployees } from "@/features/establishment/employees/api/mutations/export-selected"

interface ExportSelectedEmployeesDialogProps {
  selectedIds: number[]
  resetSelection: () => void
}

export function ExportSelectedEmployeesDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedEmployeesDialogProps) {
  return (
    <ExportDialog
      label={`Exportar ${selectedIds.length} funcionarios seleccionados`}
      description={`Elige un formato para exportar ${selectedIds.length} funcionario(s) seleccionado(s).`}
      onExport={(format) => exportSelectedEmployees({ ids: selectedIds, format })}
      count={selectedIds.length}
      onExported={resetSelection}
    />
  )
}
