"use no memo"

import { useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { abreviarPersona } from "@/features/gestion-estudiantil/commons/utils/formatos"
import {
  toAcompanamientosFilters,
  toReportesConsumoFilters,
  useAcompanamientosQuery,
  useReportesConsumoQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import { useOpcionesResponsablesQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import {
  ACOMPANAMIENTOS_FILTROS_VACIOS,
  REPORTES_CONSUMO_FILTROS_VACIOS,
  type AcompanamientoRow,
  type ReporteConsumoRow,
  type TipoAcompanamiento,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  ESTADOS_ACOMP_FILTRO,
  ESTADOS_REPORTE_CONSUMO_FILTRO,
} from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import type {
  AccionAcomp,
  AccionReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acciones-acompanamiento"
import {
  buildColumnsAcompanamientos,
  buildColumnsReportesConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/columns-acompanamientos"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useAcompanamientosFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-acompanamientos-filtros"

/** Sede y Jornada van ocultas de entrada (el Contexto ya las muestra); «Columnas visibles» las ofrece. */
// Sustancia (solo consumo) tampoco está en el listado del prototipo G.8.CON.1.
const OCULTAS_ACOMP = { sede: false, jornada: false, sustancia: false }
const OCULTAS_REPORTES = { sede: false, jornada: false }

/** Consulta, tabla y acciones del listado de Embarazo o Consumo (§9.9, §9.10). */
export function useAcompanamientosLista(
  tipo: TipoAcompanamiento,
  onAccion: (fila: AcompanamientoRow, accion: AccionAcomp) => void,
) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  // El combo Responsable lista los funcionarios del establecimiento (fk_tfuncionario = filtro RESPONSABLE).
  const ambito = useAmbitoPrevencion("")
  const responsablesQ = useOpcionesResponsablesQuery({ establecimiento: ambito.establecimientoId })
  const responsables = useMemo(
    () => (responsablesQ.data ?? []).map((r) => ({ value: String(r.fk_tfuncionario), label: abreviarPersona(r.nombre) })),
    [responsablesQ.data],
  )
  const f = useAcompanamientosFiltros(ACOMPANAMIENTOS_FILTROS_VACIOS, goToPage, {
    estados: ESTADOS_ACOMP_FILTRO,
    responsables,
  })

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toAcompanamientosFilters(f.establecimientoId, tipo, f.search, f.filtros)),
    [f.establecimientoId, tipo, f.search, f.filtros],
  )
  const query = useAcompanamientosQuery({ filters, pageIndex, pageSize })
  const columns = useMemo(() => buildColumnsAcompanamientos({ tipo, onAccion }), [tipo, onAccion])

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
    columnVisibilityStorageKey: `prevencion-acomp-${tipo.toLowerCase()}-column-visibility`,
    initialColumnVisibility: OCULTAS_ACOMP,
  })

  return { f, query, table, filters, pageIndex, pageSize, goToPage, setPageSize }
}

/** Consulta, tabla y acciones de la vista Reportes recibidos de Consumo (solo orientación). */
export function useReportesConsumoLista(
  enabled: boolean,
  onAccion: (fila: ReporteConsumoRow, accion: AccionReporteConsumo) => void,
) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useAcompanamientosFiltros(REPORTES_CONSUMO_FILTROS_VACIOS, goToPage, { estados: ESTADOS_REPORTE_CONSUMO_FILTRO })

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toReportesConsumoFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const query = useReportesConsumoQuery({ filters, pageIndex, pageSize }, enabled)
  const columns = useMemo(() => buildColumnsReportesConsumo(onAccion), [onAccion])

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
    columnVisibilityStorageKey: "prevencion-reportes-consumo-column-visibility",
    initialColumnVisibility: OCULTAS_REPORTES,
  })

  return { f, query, table, filters, pageIndex, pageSize, goToPage, setPageSize }
}
