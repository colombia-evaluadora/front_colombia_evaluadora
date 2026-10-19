import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedEstablishments } from "@/features/establishment/institution/api/mutations/export-selected"

interface ExportSelectedEstablishmentsDialogProps {
  selectedIds: number[]
  resetSelection: () => void
}

export function ExportSelectedEstablishmentsDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedEstablishmentsDialogProps) {
  return (
    <ExportDialog
      label={`Exportar ${selectedIds.length} establecimientos seleccionados`}
      description={`Elige un formato para exportar ${selectedIds.length} establecimiento(s) seleccionado(s).`}
      onExport={(format) => exportSelectedEstablishments({ ids: selectedIds, format })}
      count={selectedIds.length}
      onExported={resetSelection}
    />
  )
}
