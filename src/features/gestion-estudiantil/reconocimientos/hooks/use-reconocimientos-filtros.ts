"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useSedesInformeQuery } from "@/features/academic-management/reports/api/query/use-cascada-query"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import {
  RECONOCIMIENTOS_FILTROS_VACIOS,
  type ReconocimientosFiltros,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"

/**
 * Búsqueda, filtros aplicados y borrador del panel de Reconocimientos. Sede → Jornada → Período salen de
 * la cascada de Informes (la misma del Observador, acotada al alcance); el Tipo, de `TIPO_RECONOCIMIENTO`.
 * Del mismo contexto sale el ESTABLECIMIENTO que piden el listado, las sugerencias y los selectores.
 */
export function useReconocimientosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ReconocimientosFiltros>(RECONOCIMIENTOS_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ReconocimientosFiltros>(RECONOCIMIENTOS_FILTROS_VACIOS)

  const aplicadas = useOpcionesCascada(filtros.sede, filtros.jornada)
  const delBorrador = useOpcionesCascada(borrador.sede, borrador.jornada)
  const sedes = useSedesInformeQuery()
  const tipos = useCatalogo("TIPO_RECONOCIMIENTO")

  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: ReconocimientosFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(RECONOCIMIENTOS_FILTROS_VACIOS)
    setBorrador(RECONOCIMIENTOS_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      tipos: tipoOpciones,
      periodos: delBorrador.periodoOpciones,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, delBorrador.periodoOpciones, tipoOpciones],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    /** Colegio del alcance (el de la sede elegida; con uno solo, ese); null mientras carga. */
    // Con sedes de varios colegios y sin sede elegida, el colegio de la primera sede del alcance.
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
