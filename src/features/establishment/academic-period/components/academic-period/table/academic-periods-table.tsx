"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TablePageHeader } from "@/components/table-page-header"
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
import { NoticeOutlet } from "@/components/notice/notice-context"

interface AcademicPeriodsDataTableProps {
  title: ReactNode
  description?: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function AcademicPeriodsDataTable({
  title,
  description,
  action,
}: AcademicPeriodsDataTableProps) {
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
      <TablePageHeader title={title} description={description}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchAcademicPeriods
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <div className="flex gap-2">
            {action}
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
          </div>
        </div>
      </TablePageHeader>

      <div className="px-(--card-spacing)">
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
