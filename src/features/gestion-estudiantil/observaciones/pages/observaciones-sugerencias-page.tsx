"use no memo"

import { useCallback, useMemo } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import {
  toObservacionesFilters,
  useObservacionesQuery,
} from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import type { ObservacionRow } from "@/features/gestion-estudiantil/observaciones/api/types"
import { buildColumnsObservaciones } from "@/features/gestion-estudiantil/observaciones/components/columns-observaciones"
import {
  useDialogosObservaciones,
  type DialogoObservacion,
} from "@/features/gestion-estudiantil/observaciones/components/dialogos/use-dialogos-observaciones"
import { SearchObservaciones } from "@/features/gestion-estudiantil/observaciones/components/search-observaciones"
import { useObservacionesAccess } from "@/features/gestion-estudiantil/observaciones/hooks/use-observaciones-access"
import { useObservacionesFiltros } from "@/features/gestion-estudiantil/observaciones/hooks/use-observaciones-filtros"

const COLUMNAS_OCULTAS = { periodo: false }

function ObservacionesContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const acceso = useObservacionesAccess()
  const f = useObservacionesFiltros(goToPage)
  const { abrir, abrirNueva, dialogos } = useDialogosObservaciones()

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toObservacionesFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const { data, isPending, isError, error, refetch } = useObservacionesQuery({ filters, pageIndex, pageSize })

  const onAccion = useCallback(
    (observacion: ObservacionRow, accion: DialogoObservacion) => abrir(accion, observacion),
    [abrir],
  )
  const columns = useMemo(() => buildColumnsObservaciones({ onAccion }), [onAccion])

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.pk),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "observaciones-sugerencias-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" disabled={!acceso.puedeCrear} onClick={abrirNueva}>
              <ControlPointIcon data-icon="inline-start" />
              Nueva observación
            </Button>
          }
        >
          Observaciones y sugerencias
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchObservaciones
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "observación" : "observaciones"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => row.original.anulada}
          growColumnId="titulo"
          growColumnClassName="whitespace-normal min-w-56"
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver las observaciones."
              : f.search || !f.conPeriodo
                ? f.hayFiltros
                  ? "No hay observaciones ni sugerencias para los filtros aplicados."
                  : "Aún no hay observaciones ni sugerencias."
                : "Aún no hay observaciones ni sugerencias en este período."
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
      {dialogos}
    </>
  )
}

/** Observaciones y sugerencias (Gestión Estudiantil 8): listado, nueva observación y acciones por fila. */
export function ObservacionesSugerenciasPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ObservacionesContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
