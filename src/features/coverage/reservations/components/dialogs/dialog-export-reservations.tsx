import { ExportDialog } from "@/components/export-dialog"
import { exportReservations } from "@/features/coverage/reservations/api/mutations/export-reservations"
import type { ReservationsQueryFilters } from "@/features/coverage/reservations/api/types/reservation"

interface ExportReservationsDialogProps {
  filters: ReservationsQueryFilters
}

export function ExportReservationsDialog({ filters }: ExportReservationsDialogProps) {
  return (
    <ExportDialog
      label="Exportar reservas filtradas"
      description="Elige un formato para exportar todas las reservas que coincidan con los filtros activos."
      onExport={(format) => exportReservations({ filters, format })}
    />
  )
}
