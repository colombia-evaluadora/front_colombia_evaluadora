"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useEstablishmentsFilters } from "../../hooks/use-establishments-filters"
import { useEstablishmentsQuery } from "../../api/query/use-establishments-query"
import { useBulkDeleteEstablishments } from "../../api/mutations/use-bulk-delete-establishments"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { Establishment } from "../../api/types/establishment"
import { columns } from "./columns"
import { DialogBulkDelete } from "../dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "../dialogs/dialog-clear-selection"
import { ExportEstablishmentsDialog } from "../dialogs/dialog-export-establishments"
import { ExportSelectedEstablishmentsDialog } from "../dialogs/dialog-export-selected-establishments"
import { SearchEstablishments } from "../search/search-establishments"
import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

interface EstablishmentsDataTableProps {
  title: ReactNode
  description?: ReactNode
  // Acción principal de la página (ej. "Agregar"). Se renderiza dentro de la
  // barra de herramientas, no en el encabezado, para que baje junto al
  // buscador.
  action?: ReactNode
}

export function EstablishmentsDataTable({
  title,
  description,
  action,
}: EstablishmentsDataTableProps) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const {
    filters,
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
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
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.establishment.deletedMany(selectedIds.length))
        resetSelection()
      },
      onError: (error) => {
        notify(error.message, { variant: "error" })
      },
    },
  })

  return (
    <>
      {/*
        Encabezado pegajoso: el `pt-4` opaco del contenedor reproduce el aire
        que la página tiene contra el header de la app (`top-14`) y, al mismo
        tiempo, tapa lo que scrollea por debajo.
      */}
      <div className="sticky top-14 z-20 bg-sidebar pt-4">
        <Card className="gap-0 overflow-hidden rounded-b-none pt-0">
          <CardHeader className="bg-muted/10 py-4">
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="pt-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SearchEstablishments
                filters={filters}
                applyFilters={applyFilters}
                clearAllFilters={clearAllFilters}
                activeFilterCount={activeFilterCount}
                statuses={establishmentStatuses}
              />

              <div className="flex items-center gap-2">
                {action}
                {hasSelection ? (
                  <>
                    <ClearSelectionDialog resetSelection={resetSelection} />
                    <DialogBulkDelete<Establishment>
                      items={selectedItems}
                      getItemId={(item) => item.id}
                      getItemLabel={(item) => item.name}
                      title="Eliminar"
                      buildDescription={(count, sample) => {
                        const list = sample.join(", ")
                        const suffix =
                          count > sample.length ? ` y ${count - sample.length} más` : ""
                        return `Se eliminarán permanentemente los establecimientos educativos ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                      }}
                      onConfirm={async (ids) => {
                        await bulkDelete.mutateAsync(ids)
                      }}
                      triggerLabel={`Eliminar (${selectedIds.length})`}
                    />
                    <ExportSelectedEstablishmentsDialog
                      selectedIds={selectedIds}
                      resetSelection={resetSelection}
                    />
                  </>
                ) : (
                  <ExportEstablishmentsDialog filters={queryFilters} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/*
        El cuerpo es su PROPIA Card, separada del encabezado sticky de
        arriba. NO se encapsulan en una misma Card: si compartieran el
        `ring-1`, el `border-b` del encabezado se sumaría al anillo y daría
        línea doble en el medio. `rounded-t-none` para pegarse a la base
        plana del encabezado; `overflow-visible` para no romper el sticky.
      */}
      <Card className="overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />

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
      </Card>
    </>
  )
}
