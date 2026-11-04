"use no memo"

import { useEffect, useState } from "react"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useOpcionesConvivencia, type Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import { FILTROS_VACIOS, SIN_GESTOR, type CasoRow, type ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { OpcionesFiltros } from "@/features/gestion-estudiantil/convivencia/components/search/search-casos"
import { acumularGestores } from "@/features/gestion-estudiantil/convivencia/utils/gestores"

/** Búsqueda, filtros aplicados y borrador del panel, y las opciones de cada filtro del listado de casos. */
export function useCasosFiltros(goToPage: (page: number) => void) {
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ConvivenciaFiltros>(FILTROS_VACIOS)
  const [borrador, setBorrador] = useState<ConvivenciaFiltros>(FILTROS_VACIOS)

  const opciones = useOpcionesConvivencia(borrador.sede, "")
  const tipos = useCatalogo("TIPO_SITUACION")
  const estados = useCatalogo("ESTADO_CASO_CONVIVENCIA")

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
    opciones: { sedes: opciones.sedeOpciones, jornadas: opciones.jornadaOpciones, tipos, estados },
  }
}

/** Gestores: los que van apareciendo en el listado; no hay un catálogo propio (§ 5b). */
export function useGestoresDelListado(rows: CasoRow[] | undefined): OpcionesFiltros["gestores"] {
  const [gestores, setGestores] = useState<Opcion[]>([])
  useEffect(() => {
    const nuevas = rows ?? []
    if (!nuevas.length) return
    setGestores((prev) => acumularGestores(prev, nuevas))
  }, [rows])
  return [{ value: SIN_GESTOR, label: "Sin gestor" }, ...gestores]
}
