"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useReservationsQuery } from "../../api/query/use-reservations-query"
import { useReservationFilters } from "../../hooks/use-reservation-filters"

import { columns } from "./columns-reservations"
import { SearchReservations } from "../search/search-reservations"
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
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchReservations
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
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
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
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
      </TableScreenBody>
    </TableScreen>
  )
}
