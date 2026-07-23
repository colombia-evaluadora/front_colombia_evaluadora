import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { EstablishmentsDataTable } from "../components/table/establishments-table"

export function EstablishmentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button variant="fill" color="primary" size="sm" onClick={() => void 0}>
            Agregar
          </Button>
        </CardAction>
        <CardTitle>Establecimiento educativo</CardTitle>
        <CardDescription>
          Lista de establecimientos con búsqueda, filtro por estado y paginación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EstablishmentsDataTable />
      </CardContent>
    </Card>
  )
}
