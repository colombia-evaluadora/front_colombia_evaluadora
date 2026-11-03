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

import { TIPO_FECHA_LABELS } from "@/features/administration/festivos/api/types"
import {
  EMPTY_FESTIVOS_FILTERS,
  type FestivosFilters,
} from "@/features/administration/festivos/hooks/use-festivos-filters"

const TIPO_OPTIONS = Object.entries(TIPO_FECHA_LABELS).map(([value, label]) => ({ value, label }))

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

interface SearchFestivosProps {
  filters: FestivosFilters
  applyFilters: (values: FestivosFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/** Buscador del listado: texto libre = nombre; `tipo:(…)` y `estado:(…)` en el popover. */
export function SearchFestivos({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchFestivosProps) {
  const [open, setOpen] = useState(false)
  const [draftTipo, setDraftTipo] = useState<string>(filters.tipo)
  const [draftEstado, setDraftEstado] = useState<string>(filters.estado)

  const syntax: QuerySyntax<FestivosFilters> = {
    empty: EMPTY_FESTIVOS_FILTERS,
    freeText: { key: "nombre", field: "q" },
    terms: [optionTerm("tipo", "tipo", TIPO_OPTIONS), optionTerm("estado", "estado", ESTADO_OPTIONS)],
  }
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Al abrir, el popover arranca con los filtros vigentes.
  useEffect(() => {
    if (!open) return
    setDraftTipo(filters.tipo)
    setDraftEstado(filters.estado)
  }, [open, filters.tipo, filters.estado])

  function handleApply() {
    applyFilters({
      q: freeText,
      tipo: draftTipo as FestivosFilters["tipo"],
      estado: draftEstado as FestivosFilters["estado"],
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
        id="festivos-search"
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
            id="festivos-tipo"
            label="Tipo de fecha"
            options={TIPO_OPTIONS}
            value={draftTipo}
            onChange={setDraftTipo}
          />
          <FiltroCombobox
            id="festivos-estado"
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
