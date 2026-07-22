"use no memo"


import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useAcademicPeriodsQuery } from "../../../api/query/use-academic-periods-query"
import { useAcademicPeriodFilters } from "../../../hooks/academic-period/use-academic-period-filters"
import { columns } from "./columns-academic-periods"
import { ExportAcademicPeriodsDialog } from "../dialogs/dialog-export-academic-periods"
import { FilterAcademicPeriodsSheet } from "../sheets/sheet-filter-academic-periods"

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

  const { table } = useDataTable({
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
        <FilterAcademicPeriodsSheet
          activeFilterCount={activeFilterCount}
          filters={filters}
          applyFilters={applyFilters}
          clearAllFilters={clearAllFilters}
        />

        <ExportAcademicPeriodsDialog filters={queryFilters} />
      </div>

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
