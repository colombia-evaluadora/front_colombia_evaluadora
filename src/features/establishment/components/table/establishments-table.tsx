"use no memo"

import { useMemo } from "react"
import { toast } from "sonner"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
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
import { useBulkDeleteEstablishments } from "../../api/mutations/use-bulk-delete-establishments"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import type { Establishment } from "../../api/types/establishment"
import { columns } from "./columns"
import { BulkDeleteFab } from "../bulk-delete-fab"
import { ExportEstablishmentsDialog } from "../dialogs/dialog-export-establishments"
import { ExportSelectedEstablishmentsDialog } from "../dialogs/dialog-export-selected-establishments"

export function EstablishmentsDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const {
    filters,
    queryFilters,
    applyFilters,
  } = useEstablishmentsFilters()

  const { data: entityStatuses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ENTITY_STATUSES)
  /**
   * El catálogo de estados es compartido entre features y viene con etiqueta
   * neutra ("Activo"). En esta tabla los establecimientos se filtran con
   * femenino ("Activa"), así que ajustamos solo el `name` al renderizar sin
   * tocar el `id` (que sigue siendo "ACTIVE" para que las queries al backend
   * y los `data.status === "ACTIVE"` del dominio sigan funcionando tal cual).
   */
  const establishmentStatuses = useMemo(
    () =>
      entityStatuses.map((status) =>
        status.id === "ACTIVE"
          ? { ...status, name: "Activa" }
          : status,
      ),
    [entityStatuses],
  )

  const { data, isPending, isError, refetch } = useEstablishmentsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

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

  const bulkDelete = useBulkDeleteEstablishments({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
        resetSelection()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  })

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full gap-4 md:grid-cols-[minmax(18rem,1fr)_minmax(12rem,16rem)]">
          <Field orientation="horizontal" variant="outlined" className="w-full max-w-full">
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
          <Field orientation="horizontal" variant="outlined" className="w-full max-w-full">
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
                  {establishmentStatuses.map((status: CatalogItem) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          {hasSelection ? (
            <ExportSelectedEstablishmentsDialog
              selectedIds={selectedIds}
              resetSelection={resetSelection}
            />
          ) : (
            <ExportEstablishmentsDialog filters={queryFilters} />
          )}
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

      {hasSelection && (
        <BulkDeleteFab<Establishment>
          selectedIds={selectedIds}
          selectedItems={selectedItems}
          getItemId={(item) => item.id}
          getItemLabel={(item) => item.name}
          buildTitle={(count, sample) => {
            const list = sample.join(", ")
            const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
            return `¿Está seguro de que desea eliminar permanentemente los establecimientos educativos ${list}${suffix} (${count} en total)? Esta acción no se puede deshacer.`
          }}
          onConfirm={async (ids) => {
            await bulkDelete.mutateAsync(ids)
          }}
          onClearSelection={resetSelection}
        />
      )}
    </>
  )
}
