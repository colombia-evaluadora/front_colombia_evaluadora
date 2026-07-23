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

import { useEstablishmentsFilters } from "../../hooks/use-establishments-filters"
import { useEstablishmentsQuery } from "../../api/query/use-establishments-query"
import { columns } from "./columns"

export function EstablishmentsDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const {
    filters,
    queryFilters,
    applyFilters,
  } = useEstablishmentsFilters()

  const { data, isPending, isError, refetch } = useEstablishmentsQuery({
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
        <div className="grid w-full gap-4 md:grid-cols-[minmax(18rem,1fr)_minmax(12rem,16rem)]">
          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="establishment-search">Buscar</FieldLabel>
            <Input
              id="establishment-search"
              value={filters.search}
              onChange={(event) =>
                applyFilters({
                  ...filters,
                  search: event.target.value,
                })
              }
              placeholder="Buscar por establecimiento, municipio o código DANE"
            />
          </Field>
          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="establishment-status">Estado</FieldLabel>
            <Select
              value={filters.statuses[0] ?? ""}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  statuses: value
                    ? ([value as "ACTIVE" | "SUSPENDED"] as const)
                    : [],
                })
              }
            >
              <SelectTrigger id="establishment-status" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Activa</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            color="muted"
            size="sm"
            onClick={() => void 0}
          >
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
        errorMessage="Ocurrió un error al cargar los establecimientos."
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
