"use no memo"

import { useCallback, useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import {
  toCaracterizacionesFilters,
  useCaracterizacionesQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-caracterizacion-query"
import { useOpcionesSedesJornadasQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import type { CaracterizacionRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { buildColumnsCaracterizaciones } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/columns-caracterizaciones"
import type { AccionCaracterizacion } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/menu-acciones-caracterizacion"
import { useCaracterizacionesFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizaciones-filtros"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/** Sede y Jornada van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { sede: false, jornada: false }

/** Consulta, tabla y acciones de la pestaña «Caracterización» (§9.8). */
export function useCaracterizacionesLista() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useCaracterizacionesFiltros(goToPage)
  const sedesJornadas = useOpcionesSedesJornadasQuery().data
  const { irCaracterizacion, irCaracterizacionEditar } = useNavegacionPrevencion()

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toCaracterizacionesFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const query = useCaracterizacionesQuery({ filters, pageIndex, pageSize })

  const sedePorId = useMemo(
    () => new Map((sedesJornadas ?? []).map((r) => [r.fk_tsede, r.sede_nombre] as const)),
    [sedesJornadas],
  )
  const jornadaPorId = useMemo(
    () => new Map((sedesJornadas ?? []).map((r) => [r.fk_tlv_jornada, r.jornada_nombre] as const)),
    [sedesJornadas],
  )

  const onAccion = useCallback(
    (fila: CaracterizacionRow, accion: AccionCaracterizacion) =>
      accion === "ver" ? irCaracterizacion(fila.fk_tmatricula) : irCaracterizacionEditar(fila.fk_tmatricula),
    [irCaracterizacion, irCaracterizacionEditar],
  )
  const columns = useMemo(
    () => buildColumnsCaracterizaciones({ sedePorId, jornadaPorId, onAccion }),
    [sedePorId, jornadaPorId, onAccion],
  )

  const { table } = useDataTable({
    columns,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.fk_tmatricula),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-caracterizaciones-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  return { f, query, table, filters, pageIndex, pageSize, goToPage, setPageSize }
}
