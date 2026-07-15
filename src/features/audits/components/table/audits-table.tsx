"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useAuditsQuery } from "../../api/query/use-audits-query"
import { usePagination } from "../../hooks/use-pagination"
import { useAuditsFilters } from "../../hooks/use-audits-filters"

import { columns } from "./columns"
import { FilterAuditsSheet } from "../sheets/sheet-filter-audits"
import { ExportSelectedAuditsDialog } from "../dialogs/dialog-export-selected-audits"
import { ExportAuditsDialog } from "../dialogs/dialog-export-audits"
import { ClearSelectionDialog } from "../dialogs/dialog-clear-selection"
import { AuditsStatsCards } from "../stats/audits-stats-cards"

export function AuditsDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    usePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useAuditsFilters()
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
    <>
      <AuditsStatsCards
        selectedIds={selectedIds}
        hasSelection={hasSelection}
        filters={queryFilters}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex gap-2">
          {hasSelection ? (
            <>
              <ExportSelectedAuditsDialog
                selectedIds={selectedIds}
                resetSelection={resetSelection}
              />
              <ClearSelectionDialog resetSelection={resetSelection} />
            </>
          ) : (
            <ExportAuditsDialog filters={queryFilters} />
          )}
        </div>
        <div className="flex gap-2">
          <DataTableViewOptions table={table} />
          <FilterAuditsSheet
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
        errorMessage="Ocurrió un error al cargar las sesiones."
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
