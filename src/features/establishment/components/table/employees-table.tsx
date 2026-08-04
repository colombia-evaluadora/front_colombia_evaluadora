"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TablePageHeader } from "@/components/table-page-header"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { CATALOGS } from "@/lib/catalogs"

import { useCatalogQuery } from "../../api/query/use-catalogs"
import { useEmployeesFilters } from "../../hooks/use-employees-filters"
import type { CatalogItem } from "../../api/types/catalog"
import type { EmployeeListItem } from "../../api/types/employee"
import { useEmployeesQuery } from "../../api/query/use-employees-query"
import { useBulkDeleteEmployees } from "../../api/mutations/use-bulk-delete-employees"
import { createEmployeeColumns } from "./columns-employees"
import { DialogBulkDelete } from "../dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "../dialogs/dialog-clear-selection"
import { ExportEmployeesDialog } from "../dialogs/dialog-export-employees"
import { ExportSelectedEmployeesDialog } from "../dialogs/dialog-export-selected-employees"
import { SearchEmployees } from "../search/search-employees"
import { useNotify, NoticeOutlet } from "../common/notice-context"

interface EmployeesDataTableProps {
  onEditEmployee: (employeeId: string) => void
  title: ReactNode
  description?: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function EmployeesDataTable({
  onEditEmployee,
  title,
  description,
  action,
}: EmployeesDataTableProps) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

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

  const columns = useMemo(() => createEmployeeColumns({ onEdit: onEditEmployee }), [onEditEmployee])

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

  const bulkDelete = useBulkDeleteEmployees({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        resetSelection()
      },
      onError: (error) => {
        notify(error.message, { variant: "error" })
      },
    },
  })

  return (
    <>
      <TablePageHeader title={title} description={description}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SearchEmployees
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            roles={roles}
            workSchedules={workSchedules}
            statuses={entityStatuses}
          />

          <div className="flex items-center gap-2">
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
      </div>
    </>
  )
}