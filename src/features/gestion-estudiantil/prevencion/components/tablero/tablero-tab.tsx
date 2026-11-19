"use no memo"

import { useCallback, useMemo, type ReactNode } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"
import { Pagination } from "@/components/pagination"
import {
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import {
  historialQueryOptions,
  toTableroFilters,
  useTableroQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { useOpcionesGruposQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import type { TableroRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { AccionTablero } from "@/features/gestion-estudiantil/prevencion/components/tablero/menu-acciones-tablero"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { buildColumnsTablero } from "@/features/gestion-estudiantil/prevencion/components/tablero/columns-tablero"
import { SearchTablero } from "@/features/gestion-estudiantil/prevencion/components/tablero/search-tablero"
import { ultimaValoracionVigente } from "@/features/gestion-estudiantil/prevencion/utils/historial"
import { useTableroFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-tablero-filtros"

const COLUMNAS_OCULTAS = { sede: false, jornada: false }

interface Props {
  /** Pestañas de la página: el encabezado se pinta aquí para que la barra de filtros quede dentro de él. */
  tabs: ReactNode
}

/** Pestaña «Tablero de alertas» (§9.1): estudiantes con señales de riesgo, filtros y acciones por fila. */
export function TableroTab({ tabs }: Props) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useTableroFiltros(goToPage)

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toTableroFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const { data, isPending, isError, error, refetch } = useTableroQuery({ filters, pageIndex, pageSize })

  const queryClient = useQueryClient()
  const { irValorar, irPlanNuevo, irHistorial } = useNavegacionPrevencion()
  // Valorar, Crear plan y Ver historial son pantallas. «Gestionar» (9.11) no tiene backend: llega deshabilitado.
  const onAccion = useCallback(
    (fila: TableroRow, accion: AccionTablero) => {
      if (accion === "valorar") irValorar(fila.fk_tmatricula)
      else if (accion === "plan") {
        // El origen del plan es la última valoración vigente; si el historial no responde, se crea sin origen.
        queryClient
          .fetchQuery({ ...historialQueryOptions(fila.fk_tmatricula), staleTime: 0 })
          .then((h) => ultimaValoracionVigente(h))
          .catch(() => undefined)
          .then((valoracion) => irPlanNuevo(fila.fk_tmatricula, valoracion))
      }
      else if (accion === "historial") irHistorial(fila.fk_tmatricula, fila.grado_grupo)
    },
    [queryClient, irValorar, irPlanNuevo, irHistorial],
  )

  // Sede y Jornada por grupo: la fila trae el pk del grupo y de la sede, no sus nombres.
  const grupos = useOpcionesGruposQuery({ establecimiento: f.establecimientoId })
  const { sedePorGrupo, jornadaPorGrupo } = useMemo(() => {
    const lista = grupos.data ?? []
    return {
      sedePorGrupo: new Map(lista.map((g) => [g.fk_tgrupo, g.sede_nombre])),
      jornadaPorGrupo: new Map(lista.map((g) => [g.fk_tgrupo, g.jornada_nombre])),
    }
  }, [grupos.data])
  const columns = useMemo(
    () => buildColumnsTablero({ sedePorGrupo, jornadaPorGrupo, onAccion }),
    [sedePorGrupo, jornadaPorGrupo, onAccion],
  )

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.fk_tmatricula),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-tablero-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  const total = data?.totalCount ?? 0
  const faltanDatos = (data?.rows ?? []).some((r) => r.faltan_datos)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle>Prevención y retención</TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchTablero
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
      </TableScreenHeader>

      <TableScreenBody>
        {faltanDatos && (
          <Alert className="mb-3">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>Faltan datos de asistencia o de edad para calcular algunas señales.</AlertDescription>
          </Alert>
        )}
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          growColumnId="senales"
          growColumnClassName="whitespace-normal min-w-56"
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas."
              : filters == null && f.opciones.sedes.length > 1
                ? "Elija una Sede en los filtros para ver el tablero."
                : f.hayFiltros
                  ? "No hay estudiantes para los filtros aplicados."
                  : "Ninguna señal activa con los datos registrados."
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
