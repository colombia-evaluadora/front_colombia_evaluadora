import { Link } from "@tanstack/react-router"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { paths } from "@/config/paths"

import { useAuditTablesQuery } from "../../api/query/use-audit-tables-query"

export function AuditTablesGrid() {
  const { data, isPending, isError, refetch } = useAuditTablesQuery()

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Ocurrió un error al cargar las tablas.{" "}
        <button
          type="button"
          onClick={() => refetch()}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Reintentar
        </button>
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data?.map((table) => {
        const Icon = getNavIcon(table.icon)
        return (
          <Link
            key={table.slug}
            to={paths.app.auditoriaTablaDetalle.getHref(table.slug)}
          >
            <Card size="sm" className="h-full transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon weight="fill" className="size-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold">{table.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {table.operationsToday} ops hoy
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
