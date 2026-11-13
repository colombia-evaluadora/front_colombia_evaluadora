"use no memo"

import { useCallback, useMemo, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import {
  VALORACIONES_FILTROS_VACIOS,
  type ValoracionesFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADOS_PLAN_FILTRO } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/**
 * Búsqueda, filtros aplicados y borrador del panel de Valoraciones y planes. Sede → Jornada salen de
 * `/opciones/sedes-jornadas`; Nivel de riesgo, de `NIVEL_RIESGO`; Estado del plan, del enum del backend con etiqueta.
 */
export function useValoracionesFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ValoracionesFiltros>(VALORACIONES_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ValoracionesFiltros>(VALORACIONES_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const niveles = useCatalogo("NIVEL_RIESGO")

  const nivelOpciones = useMemo(() => niveles.map((n) => ({ value: n.codigo, label: n.label })), [niveles])

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: ValoracionesFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(VALORACIONES_FILTROS_VACIOS)
    setBorrador(VALORACIONES_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      niveles: nivelOpciones,
      estados: ESTADOS_PLAN_FILTRO,
      anuladas: [{ value: "true", label: "Incluir anuladas" }],
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, nivelOpciones],
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
