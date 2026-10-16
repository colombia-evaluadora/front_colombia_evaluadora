import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import type { SelectOption } from "@/lib/catalog-options"

import {
  EMPTY_AREAS_OFICIALES_FILTERS,
  type AreasOficialesFilters,
} from "@/features/administration/areas-oficiales/hooks/use-areas-oficiales-filters"

const SEARCH_INPUT_ID = "areas-oficiales-search"

const ESTADO_OPTIONS = [
  { value: "activa", label: "Activa" },
  { value: "inactiva", label: "Inactiva" },
]

interface SearchAreasOficialesProps {
  filters: AreasOficialesFilters
  applyFilters: (values: AreasOficialesFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
  niveles: SelectOption<number>[]
}

/** Buscador del listado: texto libre = nombre; `nivel:(…)` y `estado:(…)` en el popover. */
export function SearchAreasOficiales({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  niveles,
}: SearchAreasOficialesProps) {
  const [open, setOpen] = useState(false)
  const [draftNivel, setDraftNivel] = useState(filters.nivel)
  const [draftEstado, setDraftEstado] = useState<string>(filters.estado)

  const nivelOptions = niveles.map((n) => ({ value: String(n.value), label: n.label }))
  const syntax: QuerySyntax<AreasOficialesFilters> = {
    empty: EMPTY_AREAS_OFICIALES_FILTERS,
    freeText: { key: "nombre", field: "q" },
    terms: [optionTerm("nivel", "nivel", nivelOptions), optionTerm("estado", "estado", ESTADO_OPTIONS)],
  }
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Al abrir, el popover arranca con los filtros vigentes.
  useEffect(() => {
    if (!open) return
    setDraftNivel(filters.nivel)
    setDraftEstado(filters.estado)
  }, [open, filters.nivel, filters.estado])

  function handleApply() {
    applyFilters({
      q: freeText,
      nivel: draftNivel,
      estado: draftEstado as AreasOficialesFilters["estado"],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por nombre"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={activeFilterCount - (filters.q ? 1 : 0)}
        open={open}
        onOpenChange={setOpen}
        onApply={handleApply}
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <FiltroCombobox
            id="areas-oficiales-nivel"
            label="Nivel educativo"
            options={nivelOptions}
            value={draftNivel}
            onChange={setDraftNivel}
          />
          <FiltroCombobox
            id="areas-oficiales-estado"
            label="Estado"
            options={ESTADO_OPTIONS}
            value={draftEstado}
            onChange={setDraftEstado}
          />
        </div>
      </SearchQueryBar>
    </div>
  )
}

function FiltroCombobox({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  const items = [{ value: "", label: "Todos" }, ...options]
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField
        items={Object.fromEntries(items.map((item) => [item.value, item.label]))}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder="Todos" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}
