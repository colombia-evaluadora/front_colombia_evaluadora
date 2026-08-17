"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useAcademicPeriodsQuery } from "@/features/establishment/academic-period/api/query/use-academic-periods"
import { useAcademicPeriodFilters } from "@/features/establishment/academic-period/hooks/use-academic-period-filters"
import { columns } from "@/features/establishment/academic-period/components/table/columns-academic-periods"
import { ExportAcademicPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-academic-periods"
import { ExportSelectedAcademicPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-academic-periods"
import { DeleteSelectedAcademicPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-selected-academic-periods"
import { ClearSelectionAcademicPeriodsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-clear-selection-academic-periods"
import { SearchAcademicPeriods } from "@/features/establishment/academic-period/components/search/search-academic-periods"

interface AcademicPeriodsDataTableProps {
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function AcademicPeriodsDataTable({ title, action }: AcademicPeriodsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

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

  // Año lectivo + sede en vez del `name`: dos periodos de la misma sede se
  // llaman igual (el nombre no distingue), así que solo el nombre no alcanza
  // para identificar cuál falló. Solo alcanza los de la página cargada — si
  // el back rechaza un id seleccionado en otra página, el aviso cae al
  // motivo sin nombre (ver `formatBulkDeleteError`), no rompe nada.
  const namesById = useMemo(
    () =>
      new Map(
        (data?.rows ?? []).map((row) => [row.id, `${row.schoolYearId} - ${row.sedeName}`]),
      ),
    [data],
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchAcademicPeriods
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionAcademicPeriodsDialog resetSelection={resetSelection} />
                <DeleteSelectedAcademicPeriodsDialog
                  selectedIds={selectedIds}
                  namesById={namesById}
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
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
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
      </TableScreenBody>
    </TableScreen>
  )
}
