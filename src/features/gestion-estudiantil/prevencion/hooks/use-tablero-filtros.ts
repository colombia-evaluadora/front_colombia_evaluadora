"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import {
  useOpcionesGruposQuery,
  useOpcionesPeriodosQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import { useSaludMentalAccesoQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-salud-mental-query"
import { SENALES_FILTRO, etiquetaSenal } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import {
  TABLERO_FILTROS_VACIOS,
  type TableroFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"

/**
 * Búsqueda, filtros aplicados y borrador del panel del Tablero. Sede → Jornada salen de
 * `/opciones/sedes-jornadas` (acotadas al alcance); Grado/Grupo y Período, de las opciones de Prevención; Nivel de riesgo, de
 * `NIVEL_RIESGO`. De la misma lista sale el ESTABLECIMIENTO que piden el tablero y los selectores.
 */
export function useTableroFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<TableroFiltros>(TABLERO_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<TableroFiltros>(TABLERO_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const niveles = useCatalogo("NIVEL_RIESGO")

  const establecimientoId = aplicadas.establecimientoId

  const grupos = useOpcionesGruposQuery({
    establecimiento: establecimientoId,
    sede: borrador.sede ? Number(borrador.sede) : null,
    jornada: borrador.jornada ? Number(borrador.jornada) : null,
  })
  const periodos = useOpcionesPeriodosQuery({ establecimiento: establecimientoId })
  // La señal Salud mental es sensible (Regla 1): el filtro la ofrece solo a quien puede leer la pestaña.
  const verSaludMental = useSaludMentalAccesoQuery(establecimientoId).isSuccess

  const nivelOpciones = useMemo(() => niveles.map((n) => ({ value: n.codigo, label: n.label })), [niveles])
  const senalOpciones = useMemo(
    () =>
      SENALES_FILTRO.filter((s) => s !== "SALUD_MENTAL" || verSaludMental).map((s) => ({
        value: s,
        label: etiquetaSenal(s),
      })),
    [verSaludMental],
  )
  const grupoOpciones = useMemo(
    () => (grupos.data ?? []).map((g) => ({ value: String(g.fk_tgrupo), label: g.grado_grupo })),
    [grupos.data],
  )
  const periodoOpciones = useMemo(
    () =>
      [...new Map((periodos.data ?? []).map((p) => [p.fk_tperiodo_evaluacion, p])).values()].map((p) => ({
        value: String(p.fk_tperiodo_evaluacion),
        label: p.nombre,
      })),
    [periodos.data],
  )

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: TableroFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(TABLERO_FILTROS_VACIOS)
    setBorrador(TABLERO_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      grupos: grupoOpciones,
      senales: senalOpciones,
      niveles: nivelOpciones,
      periodos: periodoOpciones,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, grupoOpciones, senalOpciones, nivelOpciones, periodoOpciones],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    /** Colegio del alcance (el de la sede elegida; con uno solo, ese); null mientras carga. */
    establecimientoId,
    /** Ya se sabe que no hay colegio al que consultar (sin sedes en el alcance). */
    sinEstablecimiento: aplicadas.sinSedes,
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
