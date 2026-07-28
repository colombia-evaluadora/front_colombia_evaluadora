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

import { useCampusesFilters } from "../../hooks/use-campuses-filters"
import { useCampusesQuery } from "../../api/query/use-campuses-query"
import { columns } from "./columns-campuses"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"

export function CampusesDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const { filters, queryFilters, applyFilters } = useCampusesFilters()

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)

  const { data, isPending, isError, refetch } = useCampusesQuery({
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
            <FieldLabel htmlFor="campus-search">Buscar</FieldLabel>
            <Input
              id="campus-search"
              value={filters.search}
              onChange={(event) =>
                applyFilters({
                  ...filters,
                  search: event.target.value,
                })
              }
              placeholder="Buscar por sede o código DANE"
            />
          </Field>
          <Field orientation="horizontal" className="w-full max-w-full">
            <FieldLabel htmlFor="campus-zone">Zona</FieldLabel>
            <Select
              value={filters.zones[0] ?? ""}
              onValueChange={(value) =>
                applyFilters({
                  ...filters,
                  zones: value ? [value] : [],
                })
              }
            >
              <SelectTrigger id="campus-zone" className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">Todas</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.code}>
                      {zone.name}
                    </SelectItem>
                  ))}
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
        errorMessage="Ocurrió un error al cargar las sedes."
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