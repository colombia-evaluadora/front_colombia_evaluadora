import { useEffect, useState } from "react"

import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { FILTROS_VACIOS, type ConvivenciaFiltros } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { Opcion } from "@/features/gestion-estudiantil/convivencia/api/use-opciones-convivencia"
import type { SearchCasosProps } from "@/features/gestion-estudiantil/convivencia/components/search/search-casos"

type QueryFilters = ConvivenciaFiltros & { search: string }

const SIUCE_OPCIONES: Opcion[] = [{ value: "si", label: "Sí" }]

/** Panel de filtros del listado de casos: borrador, aplicar/limpiar y la sintaxis del texto de búsqueda. */
export function useSearchCasos({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  onDraftChange,
  opciones,
}: SearchCasosProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraftState] = useState(filters)

  function setDraft(next: ConvivenciaFiltros) {
    setDraftState(next)
    onDraftChange(next)
  }

  useEffect(() => {
    if (open) {
      setDraftState(filters)
      onDraftChange(filters)
    }
    // Al abrir, el borrador arranca de lo aplicado.
  }, [open, filters, onDraftChange])

  const badgeCount = Object.values(filters).filter(Boolean).length
  const activeFilterCount = badgeCount + (search ? 1 : 0)

  function handleApply() {
    applyFilters(draft)
    setOpen(false)
  }

  function handleClearFilters() {
    setDraft(FILTROS_VACIOS)
    applyFilters(FILTROS_VACIOS)
  }

  function handleClearAll() {
    onClearAll()
    setDraft(FILTROS_VACIOS)
    setOpen(false)
  }

  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("tipo", "tipo", opciones.tipos),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("gestor", "gestor", opciones.gestores),
      optionTerm("siuce", "pendienteSiuce", SIUCE_OPCIONES),
    ],
  }

  const { search: queryText, setSearch: setQueryText } = useQuerySearch({
    syntax,
    filters: { ...filters, search },
    applyFilters: (next) => {
      const { search: nextSearch, ...nextFilters } = next
      onSearchChange(nextSearch)
      applyFilters(nextFilters)
    },
  })

  return {
    open,
    setOpen,
    draft,
    setDraft,
    queryText,
    setQueryText,
    badgeCount,
    activeFilterCount,
    handleApply,
    handleClearFilters,
    handleClearAll,
  }
}
