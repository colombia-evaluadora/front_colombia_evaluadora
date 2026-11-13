"use no memo"

import { useCallback, useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import {
  toEstrategiasFilters,
  useEstrategiasQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import { useOpcionesSedesJornadasQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import type { EstrategiaRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { AccionEstrategia } from "@/features/gestion-estudiantil/prevencion/components/estrategias/acciones-estrategia"
import { buildColumnsEstrategias } from "@/features/gestion-estudiantil/prevencion/components/estrategias/columns-estrategias"
import { useDialogosEstrategias } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/use-dialogos-estrategias"
import { useEstrategiasFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategias-filtros"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

/** Sede y Jornada van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { sede: false, jornada: false }

/** Consulta, tabla y acciones de la pestaña «Estrategias» (§9.7). */
export function useEstrategiasLista() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useEstrategiasFiltros(goToPage)
  // «Nueva estrategia» solo la ofrece quien puede crear (Supervisor de sede y Administrador); el backend lo valida.
  const puedeCrear = useAccesoPrevencionQuery(f.establecimientoId).data?.puede_crear_estrategia === true
  const sedesJornadas = useOpcionesSedesJornadasQuery().data
  const { irEstrategiaNueva, irEstrategiaEditar, irEstrategia } = useNavegacionPrevencion()
  const dialogos = useDialogosEstrategias()

  const filters = useMemo(
    () =>
      f.establecimientoId == null ? null : toEstrategiasFilters(f.establecimientoId, f.search, f.filtros, f.tipoCodigo),
    [f.establecimientoId, f.search, f.filtros, f.tipoCodigo],
  )
  const query = useEstrategiasQuery({ filters, pageIndex, pageSize })

  const jornadaPorId = useMemo(
    () => new Map((sedesJornadas ?? []).map((r) => [r.fk_tlv_jornada, r.jornada_nombre] as const)),
    [sedesJornadas],
  )

  const { abrir } = dialogos
  const onAccion = useCallback(
    (fila: EstrategiaRow, accion: AccionEstrategia) => {
      if (accion === "ver") irEstrategia(fila.id)
      else if (accion === "modificar") irEstrategiaEditar(fila.id)
      else abrir({ dialogo: accion, estrategia: fila })
    },
    [irEstrategia, irEstrategiaEditar, abrir],
  )
  const columns = useMemo(() => buildColumnsEstrategias({ jornadaPorId, onAccion }), [jornadaPorId, onAccion])

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
    columnVisibilityStorageKey: "prevencion-estrategias-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  return {
    f,
    query,
    table,
    filters,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    irEstrategiaNueva,
    puedeCrear,
    dialogos: dialogos.dialogos,
  }
}
