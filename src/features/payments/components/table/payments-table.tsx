"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TablePageHeader } from "@/components/table-page-header"
import { useDataTable } from "@/hooks/use-data-table"
import { Card } from "@/components/ui/card"

import { usePaymentsQuery } from "../../api/query/use-payments-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { usePaymentsFilters } from "../../hooks/use-payments-filters"

import { columns } from "./columns"
import { CreatePaymentSheet } from "../sheets/sheet-create-payment"
import { FilterPaymentsSheet } from "../sheets/sheet-filter-payments"
import { DeleteAllPaymentsDialog } from "../dialogs/dialog-delete-all-payments"
import { DeleteSelectedPaymentsDialog } from "../dialogs/dialog-delete-selected-payments"
import { ClearSelectionDialog } from "../dialogs/dialog-clear-selection"

interface PaymentsDataTableProps {
  title: ReactNode
  description?: ReactNode
}

export function PaymentsDataTable({ title, description }: PaymentsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    usePaymentsFilters()
  const { data, isPending, isError, refetch } = usePaymentsQuery({
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
      <TablePageHeader title={title} description={description}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex gap-2">
            {hasSelection ? (
              <>
                <DeleteSelectedPaymentsDialog
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
                <ClearSelectionDialog resetSelection={resetSelection} />
              </>
            ) : (
              <DeleteAllPaymentsDialog filters={queryFilters} />
            )}
          </div>
          <div className="flex gap-2">
            <FilterPaymentsSheet
              activeFilterCount={activeFilterCount}
              filters={filters}
              applyFilters={applyFilters}
              clearAllFilters={clearAllFilters}
            />
            <CreatePaymentSheet />
          </div>
        </div>
      </TablePageHeader>

      {/*
        El cuerpo es su PROPIA Card, separada del encabezado sticky de
        arriba. NO se encapsulan en una misma Card: si compartieran el
        `ring-1`, el `border-b` del encabezado se sumaría al anillo y daría
        línea doble en el medio. `rounded-t-none` para pegarse a la base
        plana del encabezado; `overflow-visible` para no romper el sticky.
      */}
      <Card className="overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <DataTable
            table={table}
            isPending={isPending}
            isError={isError}
            onRetry={refetch}
            emptyMessage="Sin resultados."
            errorMessage="Ocurrió un error al cargar los pagos."
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
