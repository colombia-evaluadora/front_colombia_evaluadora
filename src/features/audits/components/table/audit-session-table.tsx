"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useAuditsQuery } from "../../api/query/use-audits-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useAuditSessionFilters } from "../../hooks/use-audit-session-filters"

import { columns } from "./columns-audit-session"
import { FilterAuditSessionSheet } from "../sheets/sheet-filter-audit-session"
import { ExportSelectedAuditSessionDialog } from "../dialogs/dialog-export-selected-audit-session"
import { ExportAuditSessionDialog } from "../dialogs/dialog-export-audit-session"
import { ClearSelectionAuditSessionDialog } from "../dialogs/dialog-clear-selection-audit-session"
import { AuditSessionStatsCards } from "../stats/audit-session-stats-cards"

export function AuditSessionDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()
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
    <>
      <AuditSessionStatsCards
        selectedIds={selectedIds}
        hasSelection={hasSelection}
        filters={queryFilters}
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex gap-2">
          {hasSelection ? (
            <>
              <ExportSelectedAuditSessionDialog
                selectedIds={selectedIds}
                resetSelection={resetSelection}
              />
              <ClearSelectionAuditSessionDialog resetSelection={resetSelection} />
            </>
          ) : (
            <ExportAuditSessionDialog filters={queryFilters} />
          )}
        </div>
        <div className="flex gap-2">
          <DataTableViewOptions table={table} />
          <FilterAuditSessionSheet
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
