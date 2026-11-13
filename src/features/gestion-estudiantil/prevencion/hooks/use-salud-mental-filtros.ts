"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import {
  SALUD_MENTAL_FILTROS_VACIOS,
  type SaludMentalFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADOS_SM_FILTRO } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/**
 * Búsqueda, filtros aplicados y borrador del panel de Salud mental. Sede → Jornada salen de
 * `/opciones/sedes-jornadas`; Severidad, de `SEVERIDAD_SENAL` (el backend filtra por el código); Estado, del
 * enum del backend con su etiqueta.
 */
export function useSaludMentalFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<SaludMentalFiltros>(SALUD_MENTAL_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<SaludMentalFiltros>(SALUD_MENTAL_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const severidades = useCatalogo("SEVERIDAD_SENAL")

  const severidadOpciones = useMemo(() => severidades.map((s) => ({ value: s.codigo, label: s.label })), [severidades])

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: SaludMentalFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(SALUD_MENTAL_FILTROS_VACIOS)
    setBorrador(SALUD_MENTAL_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      severidades: severidadOpciones,
      estados: ESTADOS_SM_FILTRO,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, severidadOpciones],
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
