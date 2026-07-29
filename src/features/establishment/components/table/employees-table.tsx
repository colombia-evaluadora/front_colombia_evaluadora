"use no memo"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { CATALOGS } from "@/lib/catalogs"

import { useCatalogQuery } from "../../api/query/use-catalogs"
import { useEmployeesFilters } from "../../hooks/use-employees-filters"
import type { CatalogItem } from "../../api/types/catalog"
import { useEmployeesQuery } from "../../api/query/use-employees-query"
import { columns } from "./columns-employees"

export function EmployeesDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const { filters, queryFilters, applyFilters } = useEmployeesFilters()

  const { data: roles = [] } = useCatalogQuery<CatalogItem>(CATALOGS.EMPLOYEE_ROLES)
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)

  const { data, isPending, isError, refetch } = useEmployeesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
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
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(18rem,1fr)_repeat(3,minmax(11rem,14rem))]">
          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="employee-search">Buscar</FieldLabel>
            <Input
              id="employee-search"
              value={filters.search}
              onChange={(event) =>
                applyFilters({
                  ...filters,
                  search: event.target.value,
                })
              }
              placeholder="Buscar por documento, nombre o sede"
            />
          </Field>

          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="employee-role">Rol</FieldLabel>
            <Select
              value={filters.roles[0] ?? ""}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  roles: value ? [value] : [],
                })
              }
            >
              <SelectTrigger id="employee-role" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todos</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.code}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="employee-schedule">Jornada</FieldLabel>
            <Select
              value={filters.workSchedules[0] ?? ""}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  workSchedules: value ? [value] : [],
                })
              }
            >
              <SelectTrigger id="employee-schedule" className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todas</SelectItem>
                  {workSchedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.code}>
                      {schedule.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="employee-status">Estado</FieldLabel>
            <Select
              value={filters.statuses[0] ?? ""}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  statuses: value ? [value as "ACTIVE" | "SUSPENDED"] : [],
                })
              }
            >
              <SelectTrigger id="employee-status" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" color="muted" size="sm" onClick={() => void 0}>
            Exportar
          </Button>
        </div>
      </div>

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