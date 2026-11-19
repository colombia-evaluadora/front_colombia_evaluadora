"use no memo"

import { useCallback, useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { FileXlsIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useValoracionesFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-valoraciones-filtros"
import {
  toValoracionesFilters,
  useValoracionesQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import type { ValoracionRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useDialogosPrevencion } from "@/features/gestion-estudiantil/prevencion/components/dialogos/use-dialogos-prevencion"
import { buildColumnsValoraciones } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/columns-valoraciones"
import type { AccionValoracion } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/menu-acciones-valoracion"
import { SearchValoraciones } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/search-valoraciones"

const COLUMNAS_OCULTAS = { grado_grupo: false }

interface Props {
  tabs: ReactNode
}

/** Pestaña «Valoraciones y planes» (§9.3): listado paginado en servidor con filtros y acciones por fila. */
export function ValoracionesTab({ tabs }: Props) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useValoracionesFiltros(goToPage)
  const { irPlan, irPlanEditar, irValoracion } = useNavegacionPrevencion()
  const dialogos = useDialogosPrevencion()

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toValoracionesFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const { data, isPending, isError, error, refetch } = useValoracionesQuery({ filters, pageIndex, pageSize })

  const onAccion = useCallback(
    (fila: ValoracionRow, accion: AccionValoracion) => {
      const estudiante = fila.estudiante_nombre
      const planId = fila.fk_tprevencion_plan
      if (accion === "ver") {
        if (planId != null) irPlan(planId)
        else irValoracion(fila.id)
      } else if (accion === "anular-valoracion") {
        dialogos.abrir({ dialogo: "anular-valoracion", valoracionId: fila.id, estudiante })
      } else if (planId != null) {
        if (accion === "avance") dialogos.abrir({ dialogo: "avance", planId, estudiante })
        else if (accion === "aceptacion") dialogos.abrir({ dialogo: "aceptacion", planId, estudiante })
        else if (accion === "marcar") dialogos.abrir({ dialogo: "marcar", planId, estudiante })
        else if (accion === "anular-plan") dialogos.abrir({ dialogo: "anular-plan", planId, estudiante })
        else if (accion === "modificar") irPlanEditar(planId)
      }
    },
    [irPlan, irPlanEditar, irValoracion, dialogos],
  )
  const columns = useMemo(() => buildColumnsValoraciones({ onAccion }), [onAccion])

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => `${row.tipo}-${row.id}`,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-valoraciones-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            // G.8.VAL.4: la exportación para el SIMPADE aún no tiene backend.
            <Button size="sm" type="button" variant="outline" disabled>
              <FileXlsIcon data-icon="inline-start" />
              Exportar para el SIMPADE
            </Button>
          }
        >
          Prevención y retención
        </TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchValoraciones
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "valoración" : "valoraciones"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver las valoraciones."
              : f.hayFiltros
                ? "No hay valoraciones para los filtros aplicados."
                : "Aún no hay valoraciones ni planes."
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
      {dialogos.dialogos}
    </>
  )
}
