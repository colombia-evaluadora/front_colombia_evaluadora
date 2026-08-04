import { Card } from "@/components/ui/card"

import { ReservationsDataTable } from "../components/table/reservations-table"

export function ReservationsPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <ReservationsDataTable
        title="Reserva de cupo"
        description="Reservas de cupo por institución, sede, grado y jornada, con indicadores de cobertura."
      />
    </Card>
  )
}
