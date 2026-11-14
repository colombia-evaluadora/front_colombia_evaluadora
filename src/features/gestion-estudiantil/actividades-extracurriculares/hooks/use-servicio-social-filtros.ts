"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  SERVICIO_SOCIAL_FILTROS_VACIOS,
  type ServicioSocialFiltros,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADOS_SERVICIO_SOCIAL_FILTRO } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"

/** Búsqueda, filtros aplicados y borrador del listado de servicio social. Grado: los grados de los grupos de la sede y jornada elegidas. */
export function useServicioSocialFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ServicioSocialFiltros>(SERVICIO_SOCIAL_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ServicioSocialFiltros>(SERVICIO_SOCIAL_FILTROS_VACIOS)

  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: ServicioSocialFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(SERVICIO_SOCIAL_FILTROS_VACIOS)
    setBorrador(SERVICIO_SOCIAL_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      grados: delBorrador.gradoOpciones,
      estados: ESTADOS_SERVICIO_SOCIAL_FILTRO,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, delBorrador.gradoOpciones],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
