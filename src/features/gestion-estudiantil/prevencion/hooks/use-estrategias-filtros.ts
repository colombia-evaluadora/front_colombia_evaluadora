"use no memo"

import { useCallback, useMemo, useState } from "react"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import {
  ESTRATEGIAS_FILTROS_VACIOS,
  type EstrategiasFiltros,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADOS_ESTRATEGIA_FILTRO } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"

/**
 * Búsqueda, filtros aplicados y borrador del panel de Estrategias. Sede → Jornada salen de
 * `/opciones/sedes-jornadas`; Tipo, de `TIPO_ESTRATEGIA_PERMANENCIA` (el backend filtra por el código);
 * Estado, del enum derivado del backend con su etiqueta.
 */
export function useEstrategiasFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<EstrategiasFiltros>(ESTRATEGIAS_FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<EstrategiasFiltros>(ESTRATEGIAS_FILTROS_VACIOS)

  const aplicadas = useAmbitoPrevencion(filtros.sede)
  const delBorrador = useAmbitoPrevencion(borrador.sede)
  const tipos = useCatalogo("TIPO_ESTRATEGIA_PERMANENCIA")

  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])
  const tipoCodigo = codigoDe(tipos, filtros.tipo)

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: EstrategiasFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(ESTRATEGIAS_FILTROS_VACIOS)
    setBorrador(ESTRATEGIAS_FILTROS_VACIOS)
    goToPage(0)
  }, [goToPage])

  const opciones = useMemo(
    () => ({
      sedes: delBorrador.sedeOpciones,
      jornadas: delBorrador.jornadaOpciones,
      tipos: tipoOpciones,
      estados: ESTADOS_ESTRATEGIA_FILTRO,
    }),
    [delBorrador.sedeOpciones, delBorrador.jornadaOpciones, tipoOpciones],
  )

  return {
    search,
    filtros,
    tipoCodigo,
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
