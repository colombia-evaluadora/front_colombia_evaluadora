import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedMatricula } from "@/features/coverage/matricula/api/mutations/export-selected-matricula"

interface ExportSelectedMatriculaDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedMatriculaDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedMatriculaDialogProps) {
  return (
    <ExportDialog
      label={`Exportar ${selectedIds.length} estudiantes seleccionados`}
      description={`Elige un formato para exportar ${selectedIds.length} estudiante(s) seleccionado(s).`}
      onExport={(format) => exportSelectedMatricula({ ids: selectedIds, format })}
      count={selectedIds.length}
      onExported={resetSelection}
    />
  )
}
