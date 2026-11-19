"use no memo"

import { useCallback, useMemo, useState } from "react"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import type { FiltrosListadoAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/search-acompanamientos"

/**
 * Búsqueda, filtros aplicados y borrador de Embarazo, Consumo y Reportes recibidos. Sede → Jornada salen de
 * `/opciones/sedes-jornadas`; Estado y Responsable los da quien llama.
 */
export function useAcompanamientosFiltros<F extends FiltrosListadoAcomp>(
  vacios: F,
  goToPage: (page: number) => void,
  extra: { estados: Opcion[]; responsables?: Opcion[] },
) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<F>(vacios)
  const [borrador, setBorrador] = useState<F>(vacios)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: F) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(vacios)
    setBorrador(vacios)
    goToPage(0)
  }, [goToPage, vacios])

  const { estados, responsables } = extra
  const opciones = useMemo(
    () => ({ sedes: delBorrador.sedeOpciones, jornadas: delBorrador.jornadaOpciones, estados, responsables }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, estados, responsables],
  )

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    establecimientoId: aplicadas.establecimientoId,
    sinEstablecimiento: aplicadas.sinSedes,
    onSearchChange,
    applyFilters,
    onClearAll,
    onDraftChange: setBorrador,
    opciones,
  }
}
