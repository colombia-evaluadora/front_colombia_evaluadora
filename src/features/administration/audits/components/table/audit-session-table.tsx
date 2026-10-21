"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { AuditViewTabs } from "@/features/administration/audits/components/audit-view-tabs"
import { getErrorMessage } from "@/lib/api-client"

import { useAuditsQuery } from "@/features/administration/audits/api/query/use-audits-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useAuditSessionFilters } from "@/features/administration/audits/hooks/use-audit-session-filters"

import { columns } from "@/features/administration/audits/components/table/columns-audit-session"
import { SearchAuditSession } from "@/features/administration/audits/components/search/search-audit-session"
import { ExportSelectedAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-export-selected-audit-session"
import { ExportAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-export-audit-session"
import { ClearSelectionAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-clear-selection-audit-session"
import { AuditSessionStatsCards } from "@/features/administration/audits/components/stats/audit-session-stats-cards"

export function AuditSessionDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useAuditSessionFilters()
  const { data, isPending, isError, error, refetch } = useAuditsQuery({
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
    columnVisibilityStorageKey: "audit-session-table-column-visibility",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Sesiones de auditoría</TableScreenTitle>

        <AuditViewTabs />
        <TableScreenToolbar>
          <SearchAuditSession
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
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
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
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
          errorMessage={error ? getErrorMessage(error) : undefined}
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
