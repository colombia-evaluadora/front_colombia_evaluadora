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
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { useMatriculaFilters } from "@/features/coverage/hooks/use-matricula-filters"
import { useMatriculaQuery } from "@/features/coverage/api/query/use-matricula-query"
import { columnsMatricula } from "@/features/coverage/components/table/columns-matricula"
import { SearchMatricula } from "@/features/coverage/components/search/search-matricula"
import { ExportMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-export-matricula"
import { ExportSelectedMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-export-selected-matricula"
import { ModificarMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-modificar-matricula"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"

interface MatriculaDataTableProps {
  title: ReactNode
  // Acción principal de la página ("Agregar estudiante"). Se renderiza en la
  // barra de herramientas, junto al buscador — mismo criterio que la tabla de
  // establecimientos.
  action?: ReactNode
  // Acción que va en la misma fila que el título (ej. el ícono de
  // configuración) — distinto de `action`, que va junto al buscador.
  titleAction?: ReactNode
}

export function MatriculaDataTable({ title, action, titleAction }: MatriculaDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useMatriculaFilters()

  const { data, isPending, isError, refetch } = useMatriculaQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns: columnsMatricula,
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

  const rows = data?.rows ?? []
  const selectedRowIds = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id),
    [rows, selectedIds],
  )
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  )

  function deselectRow(id: string) {
    table.getRow(id)?.toggleSelected(false)
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle action={titleAction}>{title}</TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
          <TableScreenToolbar>
            <SearchMatricula
              filters={filters}
              applyFilters={applyFilters}
              clearAllFilters={clearAllFilters}
              activeFilterCount={activeFilterCount}
            />

            <TableScreenActions>
              {hasSelection ? (
                <>
                  <ModificarMatriculaDialog
                    selected={selectedRows}
                    onRemove={deselectRow}
                    resetSelection={resetSelection}
                  />
                  <ClearSelectionDialog resetSelection={resetSelection} />
                  <ExportSelectedMatriculaDialog
                    selectedIds={selectedRowIds}
                    resetSelection={resetSelection}
                  />
                </>
              ) : (
                <>
                  {action}
                  <ExportMatriculaDialog filters={queryFilters} />
                </>
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
            errorMessage="Ocurrió un error al cargar la matrícula."
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
    </NoticeProvider>
  )
}
