import { Card } from "@/components/ui/card"

import { PaymentsDataTable } from "../components/table/payments-table"

export function PaymentsPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <PaymentsDataTable
        title="Pagos"
        description="Listado de pagos con filtros, orden y paginación resueltos vía un endpoint de query simulado (POST /payments/query)."
      />
    </Card>
  )
}
