"use no memo"

import type { ReactNode } from "react"

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
import { NoticeProvider } from "@/components/notice/notice-context"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"

import { useMatriculaFilters } from "@/features/coverage/matricula/hooks/use-matricula-filters"
import { useMatriculaQuery } from "@/features/coverage/matricula/api/query/use-matricula-query"
import { getErrorMessage } from "@/lib/api-client"
import { columnsMatricula, MATRICULA_EXPORT_COLUMN_KEYS } from "@/features/coverage/matricula/components/table/columns-matricula"
import { SearchMatricula } from "@/features/coverage/matricula/components/search/search-matricula"
import { ExportMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-matricula"
import { ExportSelectedMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-export-selected-matricula"
import { ModificarMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-modificar-matricula"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"

interface MatriculaDataTableProps {
  title: ReactNode
  action?: ReactNode
  titleAction?: ReactNode
}

export function MatriculaDataTable({ title, action, titleAction }: MatriculaDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useMatriculaFilters()

  const { data, isPending, isError, error, refetch } = useMatriculaQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds: selectedRowIds, selectedRows, hasSelection, resetSelection } = useDataTable({
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
    columnVisibilityStorageKey: "table-matricula-column-visibility",
  })

  function deselectRow(id: string) {
    // Sobre el estado: la fila puede estar en otra página.
    table.setRowSelection(({ [id]: _, ...rest }) => rest)
  }

  const exportColumns = table
    .getVisibleLeafColumns()
    .map((column) => MATRICULA_EXPORT_COLUMN_KEYS[column.id])
    .filter((key) => key !== undefined)

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle action={titleAction}>{title}</TableScreenTitle>
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
                  <OnlineOnlyAction>
                    <ModificarMatriculaDialog
                      selected={selectedRows}
                      onRemove={deselectRow}
                      resetSelection={resetSelection}
                    />
                  </OnlineOnlyAction>
                  <ClearSelectionDialog resetSelection={resetSelection} />
                  <OnlineOnlyAction>
                    <ExportSelectedMatriculaDialog
                      selectedIds={selectedRowIds}
                      resetSelection={resetSelection}
                    />
                  </OnlineOnlyAction>
                </>
              ) : (
                <>
                  {action}
                  <OnlineOnlyAction>
                    <ExportMatriculaDialog filters={queryFilters} columns={exportColumns} />
                  </OnlineOnlyAction>
                </>
              )}
            </TableScreenActions>
          </TableScreenToolbar>
        </TableScreenHeader>

        <TableScreenBody>
          <DataTable
            table={table}
            isPending={isPending}
            // Sin red, el refetch de lo guardado en el equipo falla: se sigue
            // mostrando la copia guardada (como en referentes curriculares).
            isError={isError && !data}
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
    </NoticeProvider>
  )
}
