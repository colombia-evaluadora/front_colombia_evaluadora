"use no memo"

import { useCallback, useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"

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
import { paths } from "@/config/paths"

import {
  toReconocimientosFilters,
  useReconocimientosQuery,
} from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import { useSugerenciasQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-sugerencias-query"
import type { ReconocimientoRow } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { buildColumnsReconocimientos } from "@/features/gestion-estudiantil/reconocimientos/components/columns-reconocimientos"
import { DialogDetalleReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/dialogos/dialog-detalle-reconocimiento"
import { useDialogosReconocimientos } from "@/features/gestion-estudiantil/reconocimientos/components/dialogos/use-dialogos-reconocimientos"
import type { AccionReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/menu-acciones-reconocimiento"
import { SearchReconocimientos } from "@/features/gestion-estudiantil/reconocimientos/components/search-reconocimientos"
import { SugerenciasPorPuesto } from "@/features/gestion-estudiantil/reconocimientos/components/sugerencias-por-puesto"
import { useReconocimientosAccess } from "@/features/gestion-estudiantil/reconocimientos/hooks/use-reconocimientos-access"
import { useReconocimientosFiltros } from "@/features/gestion-estudiantil/reconocimientos/hooks/use-reconocimientos-filtros"

type Navegar = (opts: { to: string; search: Record<string, unknown>; replace?: boolean }) => void

function ReconocimientosContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const acceso = useReconocimientosAccess()
  const f = useReconocimientosFiltros(goToPage)
  const navigate = useNavigate() as unknown as Navegar
  const dialogos = useDialogosReconocimientos(f.establecimientoId)
  const { abrir, abrirNuevo, abrirOtorgar } = dialogos
  // La ruta `/reconocimientos/$reconocimientoId` (enlace del aviso) abre el detalle sobre el listado.
  const { reconocimientoId } = useParams({ strict: false }) as { reconocimientoId?: string }
  const cerrarDetalle = useCallback(() => navigate({ to: paths.app.reconocimientos.getHref(), search: {} }), [navigate])

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toReconocimientosFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const { data, isPending, isError, error, refetch } = useReconocimientosQuery({ filters, pageIndex, pageSize })

  // Los filtros del listado no aplican a las sugerencias (§7.1).
  const sugerencias = useSugerenciasQuery(
    { establecimiento: f.establecimientoId, sede: null, jornada: null },
    acceso.veSugerencias,
  )

  const onAccion = useCallback(
    (reconocimiento: ReconocimientoRow, accion: AccionReconocimiento) => {
      if (accion === "ver") navigate({ to: paths.app.reconocimientoDetalle.getHref(reconocimiento.id), search: {} })
      else abrir(accion, reconocimiento)
    },
    [navigate, abrir],
  )
  const columns = useMemo(() => buildColumnsReconocimientos({ onAccion }), [onAccion])

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "reconocimientos-column-visibility",
  })

  const total = data?.totalCount ?? 0
  const filas = sugerencias.data ?? []

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button size="sm" disabled={!acceso.puedeCrear} onClick={abrirNuevo}>
              <ControlPointIcon data-icon="inline-start" />
              Nuevo reconocimiento
            </Button>
          }
        >
          Reconocimientos
        </TableScreenTitle>
        {acceso.veSugerencias && filas.length > 0 && (
          <SugerenciasPorPuesto sugerencias={filas} onOtorgar={abrirOtorgar} puedeOtorgar={acceso.puedeCrear} />
        )}
        <TableScreenToolbar>
          <SearchReconocimientos
            search={f.search}
            onSearchChange={f.onSearchChange}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "reconocimiento" : "reconocimientos"}
          </p>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => row.original.anulado}
          growColumnId="motivo"
          growColumnClassName="whitespace-normal min-w-56"
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver los reconocimientos."
              : f.hayFiltros
                ? "No hay reconocimientos para los filtros aplicados."
                : "Aún no hay reconocimientos."
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
      {reconocimientoId && !Number.isNaN(Number(reconocimientoId)) && (
        <DialogDetalleReconocimiento reconocimientoId={Number(reconocimientoId)} onClose={cerrarDetalle} />
      )}
    </>
  )
}

/** Reconocimientos (Gestión Estudiantil 7.1 y 7.2): listado, sugerencias por Puesto y acciones por fila. */
export function ReconocimientosPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ReconocimientosContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
