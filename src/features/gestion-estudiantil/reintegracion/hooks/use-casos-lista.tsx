"use no memo"

import { useCallback, useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { toCasosFilters, useCasosQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-casos-query"
import { usePermisosReintegracionQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-permisos-query"
import type { CasoRow } from "@/features/gestion-estudiantil/reintegracion/api/types"
import type { AccionCaso } from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"
import { buildColumnsCasos } from "@/features/gestion-estudiantil/reintegracion/components/columns-casos"
import { useDialogosCaso } from "@/features/gestion-estudiantil/reintegracion/components/use-dialogos-caso"
import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"
import { useCasosFiltros } from "@/features/gestion-estudiantil/reintegracion/hooks/use-casos-filtros"

/** Sede y Jornada van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { sede: false, jornada: false }

/** Consulta, tabla y acciones de la bandeja de la Ruta de Reintegración (§10.1). */
export function useCasosLista() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useCasosFiltros(goToPage)
  // «+ Abrir caso» solo lo ofrece quien puede abrir (el backend lo vuelve a validar).
  const puedeAbrir = usePermisosReintegracionQuery(f.establecimientoId).data?.puede_abrir === true
  const { irAbrirCaso } = useNavegacionReintegracion()
  const dialogos = useDialogosCaso()

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toCasosFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const query = useCasosQuery({ filters, pageIndex, pageSize })

  // Ver caso y Abrir caso de convivencia navegan; el resto abre su modal con el caso cargado.
  const { abrir } = dialogos
  const onAccion = useCallback(
    (fila: CasoRow, accion: AccionCaso) => abrir(accion, fila.id),
    [abrir],
  )
  const columns = useMemo(() => buildColumnsCasos({ onAccion }), [onAccion])

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
    columnVisibilityStorageKey: "reintegracion-casos-column-visibility",
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
    puedeAbrir,
    abrirCaso: irAbrirCaso,
    dialogos: dialogos.dialogos,
  }
}
