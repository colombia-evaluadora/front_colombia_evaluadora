import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import { paths } from "@/config/paths"

import { EstablishmentsDataTable } from "../components/table/establishments-table"

export function EstablishmentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            render={<Link to={paths.app.establishments.add.getHref()} />}
            variant="fill"
            color="primary"
            size="sm"
            nativeButton={false}
          >
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
