"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TablePageHeader } from "@/components/table-page-header"
import { useDataTable } from "@/hooks/use-data-table"

import { useAuditsQuery } from "../../api/query/use-audits-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useAuditSessionFilters } from "../../hooks/use-audit-session-filters"

import { columns } from "./columns-audit-session"
import { SearchAuditSession } from "../search/search-audit-session"
import { ExportSelectedAuditSessionDialog } from "../dialogs/dialog-export-selected-audit-session"
import { ExportAuditSessionDialog } from "../dialogs/dialog-export-audit-session"
import { ClearSelectionAuditSessionDialog } from "../dialogs/dialog-clear-selection-audit-session"
import { AuditSessionStatsCards } from "../stats/audit-session-stats-cards"

interface AuditSessionDataTableProps {
  title: ReactNode
  description?: ReactNode
  // Acción de navegación del encabezado (ej. "Por tablas").
  action?: ReactNode
}

export function AuditSessionDataTable({
  title,
  description,
  action,
}: AuditSessionDataTableProps) {
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
    <>
      <TablePageHeader title={title} description={description} action={action}>
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
        </div>
      </TablePageHeader>

      <div className="px-(--card-spacing)">
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
    </>
  )
}
