import { useEffect, useState } from "react"

import { optionTerm, textTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import {
  PROCESOS_FILTROS_VACIOS,
  type ProcesosFiltros,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { SearchProcesosProps } from "@/features/gestion-estudiantil/convivencia/components/procesos/search-procesos"

type QueryFilters = ProcesosFiltros & { search: string }

/** `dd/mm/aaaa` escrito en el buscador → `yyyy-MM-dd`; otra cosa, sin filtro todavía. */
function fechaEscrita(texto: string): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

/** Panel de filtros del listado de procesos: borrador, aplicar/limpiar y la sintaxis del texto de búsqueda. */
export function useSearchProcesos({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  onDraftChange,
  opciones,
}: SearchProcesosProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraftState] = useState(filters)

  function setDraft(next: ProcesosFiltros) {
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
    setDraft(PROCESOS_FILTROS_VACIOS)
    applyFilters(PROCESOS_FILTROS_VACIOS)
  }

  function handleClearAll() {
    onClearAll()
    setDraft(PROCESOS_FILTROS_VACIOS)
    setOpen(false)
  }

  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...PROCESOS_FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("estado", "estado", opciones.estados),
      optionTerm("responsable", "responsable", opciones.responsables),
      optionTerm("instancia", "instancia", opciones.instancias),
      textTerm("desde", "desde", { format: formatFecha, parse: fechaEscrita }),
      textTerm("hasta", "hasta", { format: formatFecha, parse: fechaEscrita }),
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
