"use no memo"

import { useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useOpcionesGrupos } from "@/features/gestion-estudiantil/commons/api/use-opciones-grupos"
import { FILTROS_VACIOS, type ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import { useGestoresFiltroQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import { convivenciaKeys } from "@/features/gestion-estudiantil/convivencia/api/query-keys"

/** Búsqueda, filtros aplicados y borrador del panel, y las opciones de cada filtro del listado de casos. */
export function useCasosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ConvivenciaFiltros>(FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ConvivenciaFiltros>(FILTROS_VACIOS)

  const opciones = useOpcionesGrupos(convivenciaKeys.all, borrador.sede, "")
  const tipos = useCatalogo("TIPO_SITUACION")
  const estados = useCatalogo("ESTADO_CASO_CONVIVENCIA")
  const gestores = useGestoresFiltroQuery()

  return {
    search,
    filtros,
    hayFiltros: Boolean(search) || Object.values(filtros).some(Boolean),
    onSearchChange: (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    applyFilters: (next: ConvivenciaFiltros) => {
      setFiltros(next)
      setBorrador(next)
      goToPage(0)
    },
    onClearAll: () => {
      setSearch("")
      setFiltros(FILTROS_VACIOS)
      setBorrador(FILTROS_VACIOS)
      goToPage(0)
    },
    onDraftChange: setBorrador,
    opciones: { sedes: opciones.sedeOpciones, jornadas: opciones.jornadaOpciones, tipos, estados, gestores: gestores.data ?? [] },
  }
}
