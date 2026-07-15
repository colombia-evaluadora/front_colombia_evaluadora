import { ArrowLeftIcon } from "@phosphor-icons/react"
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
import { auditoriaTablaDetalleRoute } from "@/router"

import { useAuditTablesQuery } from "../api/query/use-audit-tables-query"
import { TableOperationsDataTable } from "../components/table/table-operations-table"

export function TableOperationsPage() {
  const { slug } = auditoriaTablaDetalleRoute.useParams()
  const { data: tables } = useAuditTablesQuery()
  const tableName = tables?.find((table) => table.slug === slug)?.name ?? slug

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
        <CardTitle>{tableName}</CardTitle>
        <CardDescription>
          Historial de operaciones (insert/update/delete) sobre los registros
          de esta tabla.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TableOperationsDataTable tableSlug={slug} />
      </CardContent>
    </Card>
  )
}
