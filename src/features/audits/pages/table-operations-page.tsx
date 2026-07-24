import { ArrowLeftIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { TableOperationsDataTable } from "../components/table/table-operations-table"

export function TableOperationsPage() {

  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaTablas.getHref()} />}
            nativeButton={false}
          >
            <ArrowLeftIcon weight="bold" className="size-4" />
            Volver
          </Button>
        </CardAction>
        <CardTitle>Detalle</CardTitle>
        <CardDescription>
          Historial de operaciones (insert/update/delete) sobre los registros
          de esta tabla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableOperationsDataTable />
      </CardContent>
    </Card>
  )
}