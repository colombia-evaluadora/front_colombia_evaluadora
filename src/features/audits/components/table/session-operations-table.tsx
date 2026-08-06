"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSessionOperationsQuery } from "../../api/query/use-session-operations-query"
import { useSessionOperationsFilters } from "../../hooks/use-session-operations-filters"

import { columns } from "./columns-session-operations"
import { SearchSessionOperations } from "../search/search-session-operations"
import { ExportSelectedSessionOperationsDialog } from "../dialogs/dialog-export-selected-session-operations"
import { ExportSessionOperationsDialog } from "../dialogs/dialog-export-session-operations"
import { ClearSelectionSessionOperationsDialog } from "../dialogs/dialog-clear-selection-session-operations"
import { NoticeOutlet } from "@/components/notice/notice-context"

interface SessionOperationsDataTableProps {
  sessionId: string
  title: ReactNode
  // Acción de navegación del encabezado (ej. "Volver").
  action?: ReactNode
}

export function SessionOperationsDataTable({
  sessionId,
  title,
  action,
}: SessionOperationsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useSessionOperationsFilters()

  const { data, isPending, isError, refetch } = useSessionOperationsQuery({
    sessionId,
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
    <>
      {/*
        Encabezado pegajoso: el `pt-4` opaco del contenedor reproduce el aire
        que la página tiene contra el header de la app (`top-14`) y, al mismo
        tiempo, tapa lo que scrollea por debajo.
      */}
      <div className="sticky top-14 z-20 bg-sidebar">
        <Card className="gap-0 overflow-hidden rounded-b-none pt-0">
          <CardHeader className="bg-muted/10 py-4">
            <CardTitle>{title}</CardTitle>
            {action ? <CardAction>{action}</CardAction> : null}
          </CardHeader>
          <CardContent className="pt-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SearchSessionOperations
                activeFilterCount={activeFilterCount}
                filters={filters}
                applyFilters={applyFilters}
                clearAllFilters={clearAllFilters}
              />

              <div className="flex gap-2">
                {hasSelection ? (
                  <>
                    <ClearSelectionSessionOperationsDialog resetSelection={resetSelection} />
                    <ExportSelectedSessionOperationsDialog
                      sessionId={sessionId}
                      selectedIds={selectedIds}
                      resetSelection={resetSelection}
                    />
                  </>
                ) : (
                  <ExportSessionOperationsDialog sessionId={sessionId} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/*
        El cuerpo es su PROPIA Card, separada del encabezado sticky de
        arriba. NO se encapsulan en una misma Card: si compartieran el
        `ring-1`, el `border-b` del encabezado se sumaría al anillo y daría
        línea doble en el medio. `rounded-t-none` para pegarse a la base
        plana del encabezado; `overflow-visible` para no romper el sticky.
      */}
      <Card className="grow overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />

          <DataTable
            table={table}
            isPending={isPending}
            isError={isError}
            onRetry={refetch}
            emptyMessage="Sin resultados."
            errorMessage="Ocurrió un error al cargar las operaciones."
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
