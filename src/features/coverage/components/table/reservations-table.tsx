"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useReservationsQuery } from "../../api/query/use-reservations-query"
import { useReservationFilters } from "../../hooks/use-reservation-filters"

import { columns } from "./columns-reservations"
import { FilterReservationsSheet } from "../sheets/sheet-filter-reservations"
import { CreateReservationSheet } from "../sheets/sheet-create-reservation"
import { ExportReservationsDialog } from "../dialogs/dialog-export-reservations"
import { ExportSelectedReservationsDialog } from "../dialogs/dialog-export-selected-reservations"
import { ClearSelectionReservationsDialog } from "../dialogs/dialog-clear-selection-reservations"
import { ReservationStatsCards } from "../stats/reservation-stats-cards"

interface ReservationsDataTableProps {
  title: ReactNode
}

export function ReservationsDataTable({ title }: ReservationsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useReservationFilters()
  const { data, isPending, isError, refetch } = useReservationsQuery({
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
          </CardHeader>
          <CardContent className="pt-7">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
              <div className="flex gap-2">
                <FilterReservationsSheet
                  activeFilterCount={activeFilterCount}
                  filters={filters}
                  applyFilters={applyFilters}
                  clearAllFilters={clearAllFilters}
                />
              </div>
              <div className="flex gap-2">
                {hasSelection ? (
                  <>
                    <ClearSelectionReservationsDialog resetSelection={resetSelection} />
                    <ExportSelectedReservationsDialog
                      selectedIds={selectedIds}
                      resetSelection={resetSelection}
                    />
                  </>
                ) : (
                  <>
                    <CreateReservationSheet />
                    <ExportReservationsDialog filters={queryFilters} />
                  </>
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
          {/* Los indicadores quedan en el cuerpo: son datos que scrollean, no
              controles que convenga tener siempre a la vista. */}
          <ReservationStatsCards
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
            errorMessage="Ocurrió un error al cargar las reservas."
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
