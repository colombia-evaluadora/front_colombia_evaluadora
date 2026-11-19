"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { TableScreenBody, TableScreenToolbar } from "@/components/layout/table-screen"
import { getErrorMessage } from "@/lib/api-client"

import { DialogoEstadoActividad } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/dialogos/dialogo-estado-actividad"
import { SearchActividades } from "@/features/gestion-estudiantil/actividades-extracurriculares/components/search-actividades"
import { useActividadesLista } from "@/features/gestion-estudiantil/actividades-extracurriculares/hooks/use-actividades-lista"

/** Pestaña Actividades (G.5.ACT.LIS): búsqueda, filtros y tabla paginada en el servidor. */
export function ListadoActividades() {
  const l = useActividadesLista()
  const { f, query, table, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenToolbar>
        <SearchActividades
          search={f.search}
          onSearchChange={f.onSearchChange}
          filters={f.filtros}
          applyFilters={f.applyFilters}
          onClearAll={f.onClearAll}
          onDraftChange={f.onDraftChange}
          opciones={f.opciones}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total} {total === 1 ? "actividad" : "actividades"}
        </p>
      </TableScreenToolbar>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.hayFiltros ? "No hay actividades para los filtros aplicados." : "Aún no hay actividades en este período."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={l.goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={l.setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
      {l.estadoDe && <DialogoEstadoActividad actividad={l.estadoDe} onClose={l.cerrarEstado} />}
    </>
  )
}
