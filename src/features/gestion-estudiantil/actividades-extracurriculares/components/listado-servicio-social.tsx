"use no memo"

import { useMemo } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TableScreenBody, TableScreenToolbar } from "@/components/layout/table-screen"
import { getErrorMessage } from "@/lib/api-client"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import {
  toServicioSocialFilters,
  useServicioSocialQuery,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import { buildColumnsServicioSocial } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/columns-servicio-social"
import { SearchServicioSocial } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/search-servicio-social"
import { useNavegacionActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-navegacion-actividades"
import { useServicioSocialFiltros } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-servicio-social-filtros"

/** Pestaña Servicio social (G.5.SOC.LIS): un estudiante por fila con sus horas y su estado. */
export function ListadoServicioSocial() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useServicioSocialFiltros(goToPage)
  const { irServicioSocial } = useNavegacionActividades()

  const filters = useMemo(() => toServicioSocialFilters(f.search, f.filtros), [f.search, f.filtros])
  const query = useServicioSocialQuery({ filters, pageIndex, pageSize })
  const columns = useMemo(
    () => buildColumnsServicioSocial({ onVer: (fila) => irServicioSocial(fila.id) }),
    [irServicioSocial],
  )

  const { table } = useDataTable({
    columns,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "servicio-social-column-visibility",
  })

  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenToolbar>
        <SearchServicioSocial
          search={f.search}
          onSearchChange={f.onSearchChange}
          filters={f.filtros}
          applyFilters={f.applyFilters}
          onClearAll={f.onClearAll}
          onDraftChange={f.onDraftChange}
          opciones={f.opciones}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total} {total === 1 ? "estudiante" : "estudiantes"}
        </p>
      </TableScreenToolbar>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.hayFiltros
              ? "No hay estudiantes para los filtros aplicados."
              : "Aún no hay estudiantes con servicio social."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
    </>
  )
}
