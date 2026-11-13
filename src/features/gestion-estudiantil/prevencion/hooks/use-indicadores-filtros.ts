"use no memo"

import { useCallback, useMemo, useState } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import {
  useOpcionesMotivosRetiroQuery,
  useOpcionesPeriodosAcademicosQuery,
  useOpcionesPeriodosQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import {
  INDICADORES_FILTROS_VACIOS,
  type IndicadoresFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { AGRUPACIONES, toIndicadoresFilters } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"

/**
 * Filtros aplicados y borrador del panel de Indicadores. Sin período elegido el backend usa el vigente;
 * Sede → Jornada salen de `/opciones/sedes-jornadas`; el Período de Evaluación depende del Período Académico del borrador.
 */
export function useIndicadoresFiltros() {
  const [filtros, setFiltros] = useState<IndicadoresFiltros>(INDICADORES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<IndicadoresFiltros>(INDICADORES_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const establecimientoId = aplicadas.establecimientoId

  const periodosAcademicos = useOpcionesPeriodosAcademicosQuery(delBorrador.establecimientoId)
  const periodos = useOpcionesPeriodosQuery({
    establecimiento: delBorrador.establecimientoId,
    periodoAcademico: borrador.periodoAcademico ? Number(borrador.periodoAcademico) : null,
  })
  const motivos = useOpcionesMotivosRetiroQuery()

  const periodoAcademicoOpciones = useMemo<Opcion[]>(() => {
    const filas = periodosAcademicos.data ?? []
    const variasSedes = new Set(filas.map((p) => p.fk_tsede)).size > 1
    return filas.map((p) => ({
      value: String(p.fk_tperiodo_academico),
      label: variasSedes ? `${p.nombre} · ${p.sede_nombre}` : p.nombre,
    }))
  }, [periodosAcademicos.data])

  const periodoOpciones = useMemo<Opcion[]>(
    () => (periodos.data ?? []).map((p) => ({ value: String(p.fk_tperiodo_evaluacion), label: p.nombre })),
    [periodos.data],
  )
  const motivoOpciones = useMemo<Opcion[]>(
    () => (motivos.data ?? []).map((m) => ({ value: m.valor, label: m.nombre })),
    [motivos.data],
  )

  const applyFilters = useCallback((next: IndicadoresFiltros) => {
    setFiltros(next)
    setBorrador(next)
  }, [])
  const onClearAll = useCallback(() => {
    setFiltros(INDICADORES_FILTROS_VACIOS)
    setBorrador(INDICADORES_FILTROS_VACIOS)
  }, [])

  const queryFilters = useMemo(
    () => (establecimientoId == null ? null : toIndicadoresFilters(establecimientoId, filtros)),
    [establecimientoId, filtros],
  )

  const opciones = useMemo(
    () => ({
      periodosAcademicos: periodoAcademicoOpciones,
      periodos: periodoOpciones,
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      agrupaciones: AGRUPACIONES,
      motivos: motivoOpciones,
    }),
    [periodoAcademicoOpciones, periodoOpciones, delBorrador.sedeOpciones, delBorrador.jornadaOpciones, motivoOpciones],
  )

  return {
    filtros,
    queryFilters,
    establecimientoId,
    sinEstablecimiento: aplicadas.sinSedes,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
