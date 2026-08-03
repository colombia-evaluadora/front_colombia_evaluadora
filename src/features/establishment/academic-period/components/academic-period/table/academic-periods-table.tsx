"use no memo"


import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useAcademicPeriodsQuery } from "../../../api/query/academic-period/use-academic-periods-query"
import { useAcademicPeriodFilters } from "../../../hooks/use-academic-period-filters"
import { columns } from "./columns-academic-periods"
import { ExportAcademicPeriodsDialog } from "../dialogs/dialog-export-academic-periods"
import { ExportSelectedAcademicPeriodsDialog } from "../dialogs/dialog-export-selected-academic-periods"
import { DeleteSelectedAcademicPeriodsDialog } from "../dialogs/dialog-delete-selected-academic-periods"
import { ClearSelectionAcademicPeriodsDialog } from "../dialogs/dialog-clear-selection-academic-periods"
import { SearchAcademicPeriods } from "../search/search-academic-periods"
import { NoticeOutlet } from "../../common/notice-context"

export function AcademicPeriodsDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useAcademicPeriodFilters()

  const { data, isPending, isError, refetch } = useAcademicPeriodsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SearchAcademicPeriods
          activeFilterCount={activeFilterCount}
          filters={filters}
          applyFilters={applyFilters}
          clearAllFilters={clearAllFilters}
        />

        <div className="flex gap-2">
          {hasSelection ? (
            <>
              <ClearSelectionAcademicPeriodsDialog resetSelection={resetSelection} />
              <DeleteSelectedAcademicPeriodsDialog
                selectedIds={selectedIds}
                resetSelection={resetSelection}
              />
              <ExportSelectedAcademicPeriodsDialog
                selectedIds={selectedIds}
                resetSelection={resetSelection}
              />
            </>
          ) : (
            <ExportAcademicPeriodsDialog filters={queryFilters} />
          )}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <NoticeOutlet className="mb-3" />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Sin resultados."
        errorMessage="Ocurrió un error al cargar los periodos académicos."
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
