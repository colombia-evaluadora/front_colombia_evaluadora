"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { useResponsablesQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import {
  ACTIVIDADES_FILTROS_VACIOS,
  type ActividadesFiltros,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { ESTADOS_ACTIVIDAD_FILTRO } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/ui-mappings"

/**
 * Búsqueda, filtros aplicados y borrador del panel del listado. Sede → Jornada salen de la cascada de Informes
 * (ya acotada al alcance); Responsable necesita sede y jornada; Tipo es el catálogo TIPO_ACTIVIDAD_EXTRA.
 */
export function useActividadesFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ActividadesFiltros>(ACTIVIDADES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ActividadesFiltros>(ACTIVIDADES_FILTROS_VACIOS)

  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)
  const tipos = useCatalogo("TIPO_ACTIVIDAD_EXTRA")
  const responsables = useResponsablesQuery(
    borrador.sede ? Number(borrador.sede) : null,
    borrador.jornada ? Number(borrador.jornada) : null,
  ).data

  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])
  const responsableOpciones = useMemo(
    () => (responsables ?? []).map((r) => ({ value: String(r.id), label: r.nombre })),
    [responsables],
  )

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: ActividadesFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(ACTIVIDADES_FILTROS_VACIOS)
    setBorrador(ACTIVIDADES_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      tipos: tipoOpciones,
      responsables: responsableOpciones,
      estados: ESTADOS_ACTIVIDAD_FILTRO,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, tipoOpciones, responsableOpciones],
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
