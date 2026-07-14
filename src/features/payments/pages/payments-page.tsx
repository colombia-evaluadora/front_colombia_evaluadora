import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { PaymentsDataTable } from "../components/table/payments-table"

export function PaymentsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
          <CardDescription>
            Listado de pagos con filtros, orden y paginación resueltos vía un
            endpoint de query simulado (POST /payments/query).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsDataTable />
        </CardContent>
      </Card>
    </div>
  )
}
