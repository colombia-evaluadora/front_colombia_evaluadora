import { ArrowLeftIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { TableOperationsDataTable } from "../components/table/table-operations-table"

export function TableOperationsPage() {
  return (
    // `overflow-visible`: el `overflow-hidden` del Card anularía el sticky
    // del encabezado.
    <Card className="overflow-visible">
      <TableOperationsDataTable
        title="Detalle"
        description="Historial de operaciones (insert/update/delete) sobre los registros de esta tabla."
        action={
          <Button
            variant="ghost"
            size="sm"
            render={<Link to={paths.app.auditoriaTablas.getHref()} />}
            nativeButton={false}
          >
            <ArrowLeftIcon weight="bold" className="size-4" />
            Volver
          </Button>
        }
      />
    </Card>
  )
}
