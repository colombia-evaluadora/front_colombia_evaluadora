"use no memo"

import { Link } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { paths } from "@/config/paths"

import { useAuditsQuery } from "../../api/query/use-audits-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useAuditSessionFilters } from "../../hooks/use-audit-session-filters"

import { columns } from "./columns-audit-session"
import { SearchAuditSession } from "../search/search-audit-session"
import { ExportSelectedAuditSessionDialog } from "../dialogs/dialog-export-selected-audit-session"
import { ExportAuditSessionDialog } from "../dialogs/dialog-export-audit-session"
import { ClearSelectionAuditSessionDialog } from "../dialogs/dialog-clear-selection-audit-session"
import { AuditSessionStatsCards } from "../stats/audit-session-stats-cards"
import { NoticeOutlet } from "@/components/notice/notice-context"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
]

export function AuditSessionDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useAuditSessionFilters()
  const { data, isPending, isError, refetch } = useAuditsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  return (
    <>     <div className="sticky top-14 z-20 gap-0 bg-sidebar">
      <Card className="gap-0 overflow-hidden rounded-b-none pt-0">
          <CardHeader className="bg-muted/10 py-4 ">
            <CardTitle>
              Sesiones de auditoría
            </CardTitle>
          </CardHeader>
  
        <div className="border-b border-border px-(--card-spacing) pt-7">
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
          <CardContent className="pt-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchAuditSession
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <div className="flex gap-2">
            {hasSelection ? (
              <>
                <ClearSelectionAuditSessionDialog resetSelection={resetSelection} />
                <ExportSelectedAuditSessionDialog
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportAuditSessionDialog filters={queryFilters} />
            )}
          </div>
        </div></CardContent>
            </Card>
            </div>
      <Card className="grow overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />

          <AuditSessionStatsCards
            selectedIds={selectedIds}
            hasSelection={hasSelection}
            filters={queryFilters}
          />
          <DataTable
            table={table}
            isPending={isPending}
            isError={isError}
            onRetry={refetch}
            emptyMessage="Sin resultados."
            errorMessage="Ocurrió un error al cargar las sesiones."
          />
          {data && (
            <Pagination
              viewOptions={<DataTableViewOptions table={table} />}
              pageIndex={pageIndex}
              pageCount={data.pageCount}
              canPrev={pageIndex > 0}
              canNext={pageIndex < data.pageCount - 1}
              onPageChange={goToPage}
              totalCount={data.totalCount}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </Card>
    </>
  )
}
