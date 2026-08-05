import { ReservationsDataTable } from "../components/table/reservations-table"

export function ReservationsPage() {
  return (
    <ReservationsDataTable
      title="Reserva de cupo"
      description="Reservas de cupo por institución, sede, grado y jornada, con indicadores de cobertura."
    />
  )
}
