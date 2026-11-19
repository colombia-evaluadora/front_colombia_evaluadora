"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  useOpcionesListaQuery,
  useOpcionesProfesionalesQuery,
} from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import {
  CASOS_FILTROS_VACIOS,
  PROFESIONAL_SIN_ASIGNAR,
  type CasosFiltros,
} from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ESTADOS_CASO_FILTRO } from "@/features/gestion-estudiantil/reintegracion/api/ui-mappings"

/**
 * Búsqueda, filtros aplicados y borrador del panel de la bandeja. Sede → Jornada salen de la cascada de
 * Informes (ya acotada al alcance); Profesional lista a quienes tienen rol en la sede y jornada elegidas, más
 * «Sin asignar» (`SIN_ASIGNAR=true`); Origen, de la lista `ORIGEN` (el backend filtra por el valor).
 */
export function useCasosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CasosFiltros>(CASOS_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<CasosFiltros>(CASOS_FILTROS_VACIOS)

  const aplicadas = useOpcionesCascada(filtros.sede, "")
  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)
  const origenes = useOpcionesListaQuery("ORIGEN").data
  const profesionales = useOpcionesProfesionalesQuery(
    borrador.sede ? Number(borrador.sede) : null,
    borrador.jornada ? Number(borrador.jornada) : null,
  ).data

  const origenOpciones = useMemo(
    () => (origenes ?? []).map((o) => ({ value: o.valor, label: o.nombre })),
    [origenes],
  )
  const profesionalOpciones = useMemo(
    () => [
      { value: PROFESIONAL_SIN_ASIGNAR, label: "Sin asignar" },
      ...(profesionales ?? []).map((p) => ({ value: String(p.fk_tusuario), label: p.nombre })),
    ],
    [profesionales],
  )

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: CasosFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(CASOS_FILTROS_VACIOS)
    setBorrador(CASOS_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      estados: ESTADOS_CASO_FILTRO,
      profesionales: profesionalOpciones,
      origenes: origenOpciones,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, profesionalOpciones, origenOpciones],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    establecimientoId: aplicadas.establecimientoId,
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
