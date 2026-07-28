import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { ReservationsDataTable } from "../components/table/reservations-table"

export function ReservationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserva de cupo</CardTitle>
        <CardDescription>
          Reservas de cupo por institución, sede, grado y jornada, con indicadores de cobertura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReservationsDataTable />
      </CardContent>
    </Card>
  )
}
