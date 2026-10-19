import { ExportDialog } from "@/components/export-dialog"
import { exportSelectedReservations } from "@/features/coverage/reservations/api/mutations/export-selected-reservations"

interface ExportSelectedReservationsDialogProps {
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedReservationsDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedReservationsDialogProps) {
  return (
    <ExportDialog
      label={`Exportar ${selectedIds.length} reservas seleccionadas`}
      description={`Se exportarán ${selectedIds.length} reserva(s). Elige el formato.`}
      onExport={(format) => exportSelectedReservations({ ids: selectedIds, format })}
      count={selectedIds.length}
      onExported={resetSelection}
    />
  )
}
