"use no memo"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useSedesInformeQuery } from "@/features/academic-management/reports/api/query/use-cascada-query"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  OBSERVACIONES_FILTROS_VACIOS,
  type ObservacionesFiltros,
} from "@/features/gestion-estudiantil/observaciones/api/types"

/**
 * Búsqueda, filtros aplicados y borrador del panel de Observaciones y sugerencias. Sede → Jornada →
 * Grado/Grupo y Período salen de la cascada de Informes (la misma del Observador, acotada al alcance);
 * «Dirigida a», de la lista `DESTINATARIOS_OBSERVACION`.
 *
 * El listado abre en el período en curso (G.7.LIS.1: «IE Central · Mañana» y «Período 1» ya aplicados):
 * con una sola sede y una sola jornada en el alcance se aplican solas, una vez; con varias el usuario
 * elige, porque el período depende de la sede y la jornada.
 */
export function useObservacionesFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ObservacionesFiltros>(OBSERVACIONES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ObservacionesFiltros>(OBSERVACIONES_FILTROS_VACIOS)

  const sedes = useSedesInformeQuery()
  const aplicadas = useOpcionesCascada(filtros.sede, filtros.jornada)
  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)
  const destinatarios = useCatalogo("DESTINATARIOS_OBSERVACION")
  const destinatarioOpciones = useMemo(
    () => destinatarios.map((d) => ({ value: d.value, label: d.label })),
    [destinatarios],
  )

  // Filtro inicial: avanza de a un paso (sede → jornada → período) según llegan las opciones, y se
  // detiene en cuanto el usuario toca algo o un paso tiene más de una opción.
  const inicial = useRef<"sede" | "jornada" | "periodo" | "hecho">("sede")
  const sedeUnica = sedes.data?.length === 1 ? String(sedes.data[0].id) : null
  const jornadaUnica = aplicadas.jornadaOpciones.length === 1 ? aplicadas.jornadaOpciones[0].value : null
  const periodoEnCurso = aplicadas.periodos.find((p) => p.enCurso)?.id ?? null
  useEffect(() => {
    if (inicial.current === "hecho") return
    const fijar = (cambio: Partial<ObservacionesFiltros>) => {
      setFiltros((f) => ({ ...f, ...cambio }))
      setBorrador((f) => ({ ...f, ...cambio }))
    }
    if (inicial.current === "sede" && sedes.isSuccess) {
      if (!sedeUnica) inicial.current = "hecho"
      else {
        inicial.current = "jornada"
        fijar({ sede: sedeUnica })
      }
    } else if (inicial.current === "jornada" && aplicadas.jornadaOpciones.length > 0) {
      if (!jornadaUnica) inicial.current = "hecho"
      else {
        inicial.current = "periodo"
        fijar({ jornada: jornadaUnica })
      }
    } else if (inicial.current === "periodo" && aplicadas.periodos.length > 0) {
      inicial.current = "hecho"
      if (periodoEnCurso != null) fijar({ periodo: String(periodoEnCurso) })
    }
  }, [sedes.isSuccess, sedeUnica, jornadaUnica, periodoEnCurso, aplicadas.jornadaOpciones.length, aplicadas.periodos.length])

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: ObservacionesFiltros) => {
      inicial.current = "hecho"
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    inicial.current = "hecho"
    setSearch("")
    setFiltros(OBSERVACIONES_FILTROS_VACIOS)
    setBorrador(OBSERVACIONES_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      grupos: delBorrador.grupoOpciones,
      periodos: delBorrador.periodoOpciones,
      destinatarios: destinatarioOpciones,
    }),
    [
      delBorrador.sedeOpciones,
      delBorrador.jornadaOpciones,
      delBorrador.grupoOpciones,
      delBorrador.periodoOpciones,
      destinatarioOpciones,
    ],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    /** Hay un Período de Evaluación aplicado: decide el texto del estado vacío. */
    conPeriodo: Boolean(filtros.periodo),
    /** Colegio del alcance (el de la sede elegida; con uno solo, ese); null mientras carga. */
    establecimientoId: aplicadas.establecimientoId ?? sedes.data?.[0]?.establecimientoId ?? null,
    /** Ya se sabe que no hay colegio al que consultar (sin sedes en el alcance). */
    sinEstablecimiento: sedes.isSuccess && (sedes.data?.length ?? 0) === 0,
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
