import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import type { Opcion } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/observador/components/combo-opciones"
import { ESTADOS, FILTROS_VACIOS, type CatalogoFiltros } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  filters: CatalogoFiltros
  applyFilters: (values: CatalogoFiltros) => void
  onClearAll: () => void
  tipos: Opcion[]
  situaciones: Opcion[]
}

type QueryFilters = CatalogoFiltros & { search: string }

/** Busca por código o descripción. Filtros de 2.1: Tipo, Tipo de situación y Estado, sin Sede ni Jornada. */
export function SearchCodigos({ search, onSearchChange, filters, applyFilters, onClearAll, tipos, situaciones }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const badgeCount = Object.values(filters).filter(Boolean).length

  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("tipo", "tipo", tipos),
      optionTerm("situacion", "situacion", situaciones),
      optionTerm("estado", "estado", ESTADOS),
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

  return (
    <SearchQueryBar
      id="catalogo-search"
      label={null}
      placeholder="Buscar por código o descripción"
      value={queryText}
      onValueChange={setQueryText}
      onClearAll={() => {
        onClearAll()
        setDraft(FILTROS_VACIOS)
        setOpen(false)
      }}
      onClearFilters={() => {
        setDraft(FILTROS_VACIOS)
        applyFilters(FILTROS_VACIOS)
      }}
      activeFilterCount={badgeCount + (search ? 1 : 0)}
      badgeCount={badgeCount}
      open={open}
      onOpenChange={setOpen}
      onApply={() => {
        applyFilters(draft)
        setOpen(false)
      }}
      size="lg"
      className="sm:w-full max-w-xl"
    >
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-3">
        <Combo id="catalogo-tipo" label="Tipo" value={draft.tipo} options={tipos} onChange={(tipo) => setDraft({ ...draft, tipo })} />
        <Combo id="catalogo-situacion" label="Tipo de situación" value={draft.situacion} options={situaciones} onChange={(situacion) => setDraft({ ...draft, situacion })} />
        <Combo id="catalogo-estado" label="Estado" value={draft.estado} options={ESTADOS} onChange={(estado) => setDraft({ ...draft, estado })} />
      </div>
    </SearchQueryBar>
  )
}
