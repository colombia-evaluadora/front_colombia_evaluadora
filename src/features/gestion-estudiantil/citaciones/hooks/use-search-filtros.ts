import { useEffect, useState } from "react"

import type { QuerySyntax, QueryTerm } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

export interface SearchFiltrosProps<F extends object> {
  search: string
  onSearchChange: (value: string) => void
  filters: F
  applyFilters: (values: F) => void
  onClearAll: () => void
  /** El panel pide las opciones del borrador (la jornada depende de la sede elegida). */
  onDraftChange: (draft: F) => void
}

interface Options<F extends object> extends SearchFiltrosProps<F> {
  vacios: F
  terms: QueryTerm<F & { search: string }>[]
}

/**
 * Panel de filtros de un listado: borrador, aplicar/limpiar y la sintaxis del texto de búsqueda.
 * Es el mismo comportamiento del buscador de Procesos disciplinarios, para cualquier forma de filtros.
 */
export function useSearchFiltros<F extends object>({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  onDraftChange,
  vacios,
  terms,
}: Options<F>) {
  const [open, setOpen] = useState(false)
  const [draft, setDraftState] = useState(filters)

  function setDraft(next: F) {
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
    setDraft(vacios)
    applyFilters(vacios)
  }

  function handleClearAll() {
    onClearAll()
    setDraft(vacios)
    setOpen(false)
  }

  type QueryFilters = F & { search: string }
  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...vacios, search: "" },
    freeText: { key: "texto", field: "search" },
    terms,
  }

  const { search: queryText, setSearch: setQueryText } = useQuerySearch({
    syntax,
    filters: { ...filters, search },
    applyFilters: (next) => {
      const { search: nextSearch, ...nextFilters } = next
      onSearchChange(nextSearch)
      applyFilters(nextFilters as unknown as F)
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
