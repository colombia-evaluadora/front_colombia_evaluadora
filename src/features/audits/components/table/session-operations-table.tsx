"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useSessionOperationsQuery } from "../../api/query/use-session-operations-query"
import { useSessionOperationsFilters } from "../../hooks/use-session-operations-filters"

import { columns } from "./columns-session-operations"
import { FilterSessionOperationsSheet } from "../sheets/sheet-filter-session-operations"
import { ExportSelectedSessionOperationsDialog } from "../dialogs/dialog-export-selected-session-operations"
import { ExportSessionOperationsDialog } from "../dialogs/dialog-export-session-operations"
import { ClearSelectionSessionOperationsDialog } from "../dialogs/dialog-clear-selection-session-operations"

interface SessionOperationsDataTableProps {
  sessionId: string
}

export function SessionOperationsDataTable({ sessionId }: SessionOperationsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex gap-2">
          <FilterSessionOperationsSheet
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />
        </div>
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
          <DataTableViewOptions table={table} />
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