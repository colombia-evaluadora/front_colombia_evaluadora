import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { SANCION_FILTROS_VACIOS, type SancionFiltros } from "@/features/gestion-estudiantil/configuracion/api/types"
import { ESTADOS_PROCESO } from "@/features/gestion-estudiantil/configuracion/utils/proceso"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  filters: SancionFiltros
  applyFilters: (values: SancionFiltros) => void
  onClearAll: () => void
  instancias: Opcion[]
}

type QueryFilters = SancionFiltros & { search: string }

/** Contiene las palabras (nombre), Instancia y Estado (G.10.PRD.SAN.1). */
export function SearchSanciones({ search, onSearchChange, filters, applyFilters, onClearAll, instancias }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const badgeCount = Object.values(filters).filter(Boolean).length

  const syntax: QuerySyntax<QueryFilters> = {
    empty: { ...SANCION_FILTROS_VACIOS, search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [optionTerm("instancia", "instancia", instancias), optionTerm("estado", "estado", ESTADOS_PROCESO)],
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
      id="sanciones-search"
      label={null}
      placeholder="Buscar por nombre"
      value={queryText}
      onValueChange={setQueryText}
      onClearAll={() => {
        onClearAll()
        setDraft(SANCION_FILTROS_VACIOS)
        setOpen(false)
      }}
      onClearFilters={() => {
        setDraft(SANCION_FILTROS_VACIOS)
        applyFilters(SANCION_FILTROS_VACIOS)
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
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo id="sanciones-instancia" label="Instancia" value={draft.instancia} options={instancias} onChange={(instancia) => setDraft({ ...draft, instancia })} />
        <Combo id="sanciones-estado" label="Estado" value={draft.estado} options={ESTADOS_PROCESO} onChange={(estado) => setDraft({ ...draft, estado })} />
      </div>
    </SearchQueryBar>
  )
}
