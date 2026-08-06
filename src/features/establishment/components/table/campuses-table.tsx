"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useCampusesFilters } from "../../hooks/use-campuses-filters"
import { useCampusesQuery } from "../../api/query/use-campuses-query"
import { useBulkDeleteCampuses } from "../../api/mutations/use-bulk-delete-campuses"
import { createCampusColumns } from "./columns-campuses"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import type { Campus } from "../../api/types/campus"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { DialogBulkDelete } from "../dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "../dialogs/dialog-clear-selection"
import { ExportCampusesDialog } from "../dialogs/dialog-export-campuses"
import { ExportSelectedCampusesDialog } from "../dialogs/dialog-export-selected-campuses"
import { SearchCampuses } from "../search/search-campuses"
import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"

interface CampusesDataTableProps {
  onEditCampus: (campusId: string) => void
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function CampusesDataTable({
  onEditCampus,
  title,
  action,
}: CampusesDataTableProps) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } =
    useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useCampusesFilters()

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)

  const { data, isPending, isError, refetch } = useCampusesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const columns = useMemo(() => createCampusColumns({ onEdit: onEditCampus }), [onEditCampus])

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

  const bulkDelete = useBulkDeleteCampuses({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.campus.deletedMany(selectedIds.length))
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
      <div className="sticky top-14 z-20 bg-sidebar">
        <Card className="gap-0 overflow-hidden rounded-b-none pt-0">
          <CardHeader className="bg-muted/10 py-4">
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SearchCampuses
                filters={filters}
                applyFilters={applyFilters}
                clearAllFilters={clearAllFilters}
                activeFilterCount={activeFilterCount}
                zones={zones}
              />

              <div className="flex items-center gap-2">
                {action}
                {hasSelection ? (
                  <>
                    <ClearSelectionDialog resetSelection={resetSelection} />
                    <DialogBulkDelete<Campus>
                      items={selectedItems}
                      getItemId={(item) => item.id}
                      getItemLabel={(item) => item.name}
                      title="Eliminar"
                      buildDescription={(count, sample) => {
                        const list = sample.join(", ")
                        const suffix =
                          count > sample.length ? ` y ${count - sample.length} más` : ""
                        return `Se eliminarán permanentemente las sedes educativas ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                      }}
                      onConfirm={async (ids) => {
                        await bulkDelete.mutateAsync(ids)
                      }}
                      triggerLabel={`Eliminar (${selectedIds.length})`}
                    />
                    <ExportSelectedCampusesDialog
                      selectedIds={selectedIds}
                      resetSelection={resetSelection}
                    />
                  </>
                ) : (
                  <ExportCampusesDialog filters={queryFilters} />
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
      <Card className="grow overflow-visible rounded-t-none">
        <div className="px-(--card-spacing)">
          <NoticeOutlet className="mb-3" />

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