"use no memo"

import { useState, type ReactNode } from "react"

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
import { getErrorMessage } from "@/lib/api-client"
import { employeesRoute } from "@/router"

import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { useFuncionariosQuery } from "@/features/establishment/employees/api/query/use-funcionarios"
import { ESTADO_FUNCIONARIO_OPTIONS } from "@/features/establishment/employees/api/ui-mappings"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { FuncionarioListItem } from "@/features/establishment/employees/api/types/funcionario"
import { useEmployeesFilters } from "@/features/establishment/employees/hooks/use-filters"
import { useEstablecimientoFuncionarios } from "@/features/establishment/employees/hooks/use-establecimiento-funcionarios"
import { createColumns } from "@/features/establishment/employees/components/table/columns-employees"
import { ExportEmployeesDialog } from "@/features/establishment/employees/components/dialogs/dialog-export"
import { RolesPermisosDialog } from "@/features/establishment/employees/components/dialogs/dialog-roles-permisos"
import { EstablishmentSelect } from "@/features/establishment/employees/components/establishment-select"
import { SearchEmployees } from "@/features/establishment/employees/components/search/search-employees"
import { useCampusesOptionsQuery } from "@/features/establishment/campuses/api/query/use-campuses-options"

interface EmployeesDataTableProps {
  title: ReactNode
  /** Acción principal; recibe el establecimiento elegido para llevarlo a la página del funcionario. */
  action?: (establishmentId: number | null) => ReactNode
}

export function EmployeesDataTable({ title, action }: EmployeesDataTableProps) {
  const search = employeesRoute.useSearch()
  const navigate = employeesRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } = useEmployeesFilters()
  const establecimiento = useEstablecimientoFuncionarios(search.establecimiento)
  const [rolesDe, setRolesDe] = useState<FuncionarioListItem | null>(null)

  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)
  const { data: campuses = [] } = useCampusesOptionsQuery()
  const campusesDelEE = campuses.filter(
    (campus) => campus.establishmentId == null || campus.establishmentId === establecimiento.id,
  )

  const { data, isPending, isError, error, refetch } = useFuncionariosQuery(
    establecimiento.id == null
      ? null
      : { establishmentId: establecimiento.id, filters: queryFilters, sorting, pageIndex, pageSize },
  )

  const columns = createColumns({ establishmentId: establecimiento.id, onRoles: setRolesDe })

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
    columnVisibilityStorageKey: "table-employees-column-visibility",
  })

  function elegirEstablecimiento(id: number) {
    // Las sedes son de cada establecimiento: el filtro de sede no se arrastra.
    navigate({ search: (prev) => ({ ...prev, establecimiento: id, sede: undefined, page: 0 }), replace: true })
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-end">
            {establecimiento.varios ? (
              <EstablishmentSelect
                establishments={establecimiento.establecimientos}
                value={establecimiento.id}
                onChange={elegirEstablecimiento}
              />
            ) : null}
            <SearchEmployees
              filters={filters}
              applyFilters={applyFilters}
              clearAllFilters={clearAllFilters}
              activeFilterCount={activeFilterCount}
              roles={roles}
              workSchedules={workSchedules}
              campuses={campusesDelEE}
              statuses={ESTADO_FUNCIONARIO_OPTIONS}
            />
          </div>

          <TableScreenActions>
            {establecimiento.id != null ? (
              <ExportEmployeesDialog establishmentId={establecimiento.id} filters={queryFilters} />
            ) : null}
            {action?.(establecimiento.id)}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending || establecimiento.cargando}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            !establecimiento.cargando && establecimiento.id == null
              ? "No tiene establecimientos asignados."
              : "No hay funcionarios que coincidan con la búsqueda y los filtros aplicados."
          }
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

      {establecimiento.id != null ? (
        <RolesPermisosDialog
          employee={rolesDe}
          establishmentId={establecimiento.id}
          onOpenChange={(open) => !open && setRolesDe(null)}
        />
      ) : null}
    </TableScreen>
  )
}
