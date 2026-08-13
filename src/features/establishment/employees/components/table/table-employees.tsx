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
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEmployeesFilters } from "@/features/establishment/employees/hooks/use-filters"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"
import { useEmployeesQuery } from "@/features/establishment/employees/api/query/use-employees"
import { useBulkDelete } from "@/features/establishment/employees/api/mutations/use-bulk-delete"
import { createColumns } from "@/features/establishment/employees/components/table/columns-employees"
import { DialogBulkDelete } from "@/features/establishment/employees/components/dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"
import { ExportEmployeesDialog } from "@/features/establishment/employees/components/dialogs/dialog-export"
import { ExportSelectedEmployeesDialog } from "@/features/establishment/employees/components/dialogs/dialog-export-selected"
import { SearchEmployees } from "@/features/establishment/employees/components/search/search-employees"
import { useNotify } from "@/components/notice/notice-context"

interface EmployeesDataTableProps {
  onEditEmployee: (employeeId: string) => void
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function EmployeesDataTable({ onEditEmployee, title, action }: EmployeesDataTableProps) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEmployeesFilters()

  const { data: roles = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_ROLES)
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)
  const { data: entityStatuses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ENTITY_STATUSES)

  const { data, isPending, isError, refetch } = useEmployeesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const columns = useMemo(() => createColumns({ onEdit: onEditEmployee }), [onEditEmployee])

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

  const rows = data?.rows ?? []
  const selectedItems = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  )

  const bulkDelete = useBulkDelete({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.employee.deletedMany(selectedIds.length))
        resetSelection()
      },
      onError: (error) => {
        notify(error.message, { variant: "error" })
      },
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchEmployees
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            roles={roles}
            workSchedules={workSchedules}
            statuses={entityStatuses}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionDialog resetSelection={resetSelection} />
                <DialogBulkDelete<EmployeeListItem>
                  items={selectedItems}
                  getItemId={(item) => item.id}
                  getItemLabel={(item) => item.name}
                  title="Eliminar"
                  buildDescription={(count, sample) => {
                    const list = sample.join(", ")
                    const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
                    return `Se eliminarán permanentemente los funcionarios ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                  }}
                  onConfirm={async (ids) => {
                    await bulkDelete.mutateAsync(ids)
                  }}
                  triggerLabel={`Eliminar (${selectedIds.length})`}
                />
                <ExportSelectedEmployeesDialog
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportEmployeesDialog filters={queryFilters} />
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
          errorMessage="Ocurrió un error al cargar los funcionarios."
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
