"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useTableOperationsQuery } from "../../api/query/use-table-operations-query"
import { useTableOperationsPagination } from "../../hooks/use-table-operations-pagination"
import { useTableOperationsFilters } from "../../hooks/use-table-operations-filters"

import { columns } from "./columns-table-operations"
import { FilterTableOperationsSheet } from "../sheets/sheet-filter-table-operations"
import { ExportSelectedTableOperationsDialog } from "../dialogs/dialog-export-selected-table-operations"
import { ExportTableOperationsDialog } from "../dialogs/dialog-export-table-operations"
import { ClearSelectionTableOperationsDialog } from "../dialogs/dialog-clear-selection-table-operations"
import { TableOperationsStatsCards } from "../stats/table-operations-stats-cards"

interface TableOperationsDataTableProps {
  tableSlug: string
}

export function TableOperationsDataTable({
  tableSlug,
}: TableOperationsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTableOperationsPagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useTableOperationsFilters()
  const { data, isPending, isError, refetch } = useTableOperationsQuery({
    tableSlug,
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
      <TableOperationsStatsCards
        tableSlug={tableSlug}
        selectedIds={selectedIds}
        hasSelection={hasSelection}
        filters={queryFilters}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex gap-2">
          {hasSelection ? (
            <>
              <ExportSelectedTableOperationsDialog
                tableSlug={tableSlug}
                selectedIds={selectedIds}
                resetSelection={resetSelection}
              />
              <ClearSelectionTableOperationsDialog resetSelection={resetSelection} />
            </>
          ) : (
            <ExportTableOperationsDialog tableSlug={tableSlug} filters={queryFilters} />
          )}
        </div>
        <div className="flex gap-2">
          <DataTableViewOptions table={table} />
          <FilterTableOperationsSheet
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />
        </div>
      </div>
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
    </>
  )
}
