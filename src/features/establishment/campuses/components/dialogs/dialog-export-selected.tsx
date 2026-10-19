import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedCampuses } from "@/features/establishment/campuses/api/mutations/export-selected"

interface ExportSelectedCampusesDialogProps {
  selectedIds: number[]
  resetSelection: () => void
}

export function ExportSelectedCampusesDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedCampusesDialogProps) {
  return (
    <ExportDialog
      label={`Exportar ${selectedIds.length} sedes seleccionadas`}
      description={`Elige un formato para exportar ${selectedIds.length} sede(s) seleccionada(s).`}
      onExport={(format) => exportSelectedCampuses({ ids: selectedIds, format })}
      count={selectedIds.length}
      onExported={resetSelection}
    />
  )
}
