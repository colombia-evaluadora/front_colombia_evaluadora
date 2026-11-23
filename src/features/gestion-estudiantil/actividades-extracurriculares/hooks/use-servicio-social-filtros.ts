"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useParametrosServicioSocialQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-servicio-social-query"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  SERVICIO_SOCIAL_FILTROS_VACIOS,
  type ServicioSocialFiltros,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADOS_SERVICIO_SOCIAL_FILTRO } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"

/** Búsqueda, filtros aplicados y borrador del listado de servicio social. Grado: los Grados del servicio social (parámetros), sin depender de sede ni jornada. */
export function useServicioSocialFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ServicioSocialFiltros>(SERVICIO_SOCIAL_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ServicioSocialFiltros>(SERVICIO_SOCIAL_FILTROS_VACIOS)

  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)
  const parametros = useParametrosServicioSocialQuery().data
  const grados = useMemo(
    () => (parametros?.grados ?? []).map((g) => ({ value: String(g.pk), label: g.nombre })),
    [parametros],
  )

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
      grados,
      estados: ESTADOS_SERVICIO_SOCIAL_FILTRO,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, grados],
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
