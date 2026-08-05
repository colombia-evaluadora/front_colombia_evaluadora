"use no memo"

import { Link } from "@tanstack/react-router"

import { Pagination } from "@/components/pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { paths } from "@/config/paths"
import { NoticeOutlet } from "@/components/notice/notice-context"

import { FilterAuditTablesForm } from "../forms/form-filter-audit-tables"
import { useAuditTablesFilters } from "../../hooks/use-audit-tables-filters"
import { useAuditTablesQuery } from "../../api/query/use-audit-tables-query"

const FILTER_AUDIT_TABLES_FORM_ID = "filter-audit-tables-form"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
]

export function AuditTablesDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize } = useTablePagination()
  const { filters, queryFilters, applyFilters } = useAuditTablesFilters()
  const { data, isPending, isError, refetch } = useAuditTablesQuery({
    filters: queryFilters,
    sorting: [],
    pageIndex,
    pageSize,
  })

  if (isPending) {
    return (
      <>
        <Card className="sticky top-18 z-20 gap-0 overflow-visible rounded-b-none pt-0">
          <CardHeader className="bg-muted/10 py-4">
            <CardTitle>Tablas de auditoría</CardTitle>
          </CardHeader>

        <div className="border-b border-border px-(--card-spacing)">
          <nav aria-label="Vistas de auditoría" className="flex items-end gap-1">
            {viewLinks.map((view) => (
              <Link
                key={view.to}
                to={view.to}
                activeProps={{ "data-active": "true" }}
                className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
              >
                {view.label}
              </Link>
            ))}
          </nav>
        </div>

          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-9 w-72" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible rounded-t-none">
          <div className="px-(--card-spacing)">
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
          </div>
        </Card>
      </>
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

  const rows = data?.rows ?? []
  const totalCount = data?.totalCount ?? 0
  const pageCount = data?.pageCount ?? 1

  return (
    <>
      <Card className="sticky top-18 z-20 gap-0 overflow-visible rounded-b-none pt-0">
        <CardHeader className="bg-muted/10 py-4 ">
          <CardTitle>
            Tablas de auditoría
          </CardTitle>
        </CardHeader>

        <div className="border-b border-border px-(--card-spacing)">
          <nav
            aria-label="Vistas de auditoría"
            className="flex px-8 items-end gap-1"
          >
            {viewLinks.map((view) => (
              <Link
                key={view.to}
                to={view.to}
                activeProps={{ "data-active": "true" }}
                className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
              >
                {view.label}
              </Link>
            ))}
          </nav>
        </div>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterAuditTablesForm
              id={FILTER_AUDIT_TABLES_FORM_ID}
              defaultValues={filters}
              onSubmit={applyFilters}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />
          {totalCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filters.name
                ? `Sin tablas que coincidan con "${filters.name}".`
                : "Sin tablas para mostrar."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {rows.map((table) => {
                  const Icon = getNavIcon(table.icon)
                  return (
                    <Link
                      key={table.slug}
                      to={paths.app.auditoriaTablaDetalle.getHref(table.slug)}
                    >
                      <Card
                        size="sm"
                        className="h-full transition-colors hover:bg-muted/50"
                      >
                        <CardContent className="flex flex-col gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon weight="fill" className="size-5" />
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{table.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {table.operationsToday} operaciones
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
              <Pagination
                pageIndex={pageIndex}
                pageCount={pageCount}
                canPrev={pageIndex > 0}
                canNext={pageIndex < pageCount - 1}
                onPageChange={goToPage}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      </Card>
    </>
  )
}