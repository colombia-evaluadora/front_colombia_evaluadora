"use no memo"

import { useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useOpcionesConvivencia } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { useResponsablesFiltroQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-procesos-query"
import {
  PROCESOS_FILTROS_VACIOS,
  type ProcesosFiltros,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"

/** Búsqueda, filtros aplicados y borrador del panel, y las opciones de cada filtro del listado de procesos. */
export function useProcesosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ProcesosFiltros>(PROCESOS_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ProcesosFiltros>(PROCESOS_FILTROS_VACIOS)

  // Misma cascada Sede → Jornada de la pestaña Casos.
  const opciones = useOpcionesConvivencia(borrador.sede, "")
  const estados = useCatalogo("ESTADO_PROCESO_DISCIPLINARIO")
  const instancias = useCatalogo("INSTANCIA_DISCIPLINARIA")
  const responsables = useResponsablesFiltroQuery()

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    onSearchChange: (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    applyFilters: (next: ProcesosFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    onClearAll: () => {
      setSearch("")
      setFiltros(PROCESOS_FILTROS_VACIOS)
      setBorrador(PROCESOS_FILTROS_VACIOS)
      goToPage(0)
    },
    onDraftChange: setBorrador,
    opciones: {
      sedes: opciones.sedeOpciones,
      jornadas: opciones.jornadaOpciones,
      estados,
      instancias,
      responsables: responsables.data ?? [],
    },
  }
}
