import { PaymentsDataTable } from "../components/table/payments-table"

export function PaymentsPage() {
  // El encabezado sticky y el cuerpo son dos Cards independientes, NO se
  // encapsulan en una misma Card aquí — eso lo hace internamente
  // `PaymentsDataTable`.
  return (
    <PaymentsDataTable
      title="Pagos"
      description="Listado de pagos con filtros, orden y paginación resueltos vía un endpoint de query simulado (POST /payments/query)."
    />
  )
}