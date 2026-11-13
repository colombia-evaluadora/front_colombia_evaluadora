"use no memo"

import { useCallback, useMemo, useState } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useCaracterizacionFiltrosQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-caracterizacion-query"
import {
  CARACTERIZACIONES_FILTROS_VACIOS,
  type CaracterizacionesFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADOS_CARACTERIZACION_FILTRO } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"

const unicas = (pares: [number, string][]): Opcion[] =>
  [...new Map(pares).entries()].map(([id, nombre]) => ({ value: String(id), label: nombre }))

/**
 * Búsqueda, filtros aplicados y borrador del panel de Caracterización. El establecimiento sale del ámbito
 * (`/opciones/sedes-jornadas`); las opciones de Sede, Jornada y Grado/Grupo, de `/opciones/caracterizacion-filtros`,
 * que solo ofrece lo que el listado muestra. Estado admite varios valores.
 */
export function useCaracterizacionesFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CaracterizacionesFiltros>(CARACTERIZACIONES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<CaracterizacionesFiltros>(CARACTERIZACIONES_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const establecimientoId = aplicadas.establecimientoId ?? delBorrador.establecimientoId
  const grupos = useCaracterizacionFiltrosQuery(establecimientoId).data

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: CaracterizacionesFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(CARACTERIZACIONES_FILTROS_VACIOS)
    setBorrador(CARACTERIZACIONES_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(() => {
    const filas = grupos ?? []
    const sedesConEstudiantes = new Set(filas.map((g) => g.fk_tsede))
    const sedes = delBorrador.sedeOpciones.filter((s) => filas.length === 0 || sedesConEstudiantes.has(Number(s.value)))
    const deLaSede = filas.filter((g) => !borrador.sede || String(g.fk_tsede) === borrador.sede)
    return {
      sedes,
      jornadas: borrador.sede ? unicas(deLaSede.map((g) => [g.fk_tlv_jornada, g.jornada_nombre])) : [],
      grupos: unicas(
        deLaSede
          .filter((g) => !borrador.jornada || String(g.fk_tlv_jornada) === borrador.jornada)
          .map((g) => [g.fk_tgrupo, g.grado_grupo]),
      ),
      estados: ESTADOS_CARACTERIZACION_FILTRO,
    }
  }, [grupos, delBorrador.sedeOpciones, borrador.sede, borrador.jornada])

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))),
    establecimientoId,
    sinEstablecimiento: aplicadas.sinSedes,
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
