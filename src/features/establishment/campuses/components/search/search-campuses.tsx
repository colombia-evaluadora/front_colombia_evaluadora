import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionsTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { toSelectItemsMap } from "@/lib/catalog-options"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "campuses-search"

export interface FilterOption {
  value: string
  label: string
}

const CAMPUS_STATUS_OPTIONS: FilterOption[] = [
  { value: "A", label: "Activo" },
  { value: "I", label: "Inactivo" },
]

type ListKey = "establishments" | "zones" | "workSchedules" | "statuses"

interface SearchCampusesProps {
  filters: CampusFiltersFormInput
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  /** Vacío cuando el usuario solo tiene asignaciones en un establecimiento: el filtro no se muestra. */
  establishments: FilterOption[]
  zones: FilterOption[]
  workSchedules: FilterOption[]
}

function FilterCombobox({
  id,
  label,
  emptyLabel,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  emptyLabel: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}) {
  const items = [{ value: "", label: emptyLabel }, ...options]
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField items={toSelectItemsMap(items)} value={value} onValueChange={(next) => onChange(next ?? "")}>
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder={emptyLabel} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

/** Buscador por nombre o código DANE antiguo, con los filtros Establecimiento, Zona, Jornada y Estado. */
export function SearchCampuses({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  establishments,
  zones,
  workSchedules,
}: SearchCampusesProps) {
  const [open, setOpen] = useState(false)
  const firstOf = (key: ListKey) => filters[key][0] ?? ""
  const [draft, setDraft] = useState<Record<ListKey, string>>({
    establishments: firstOf("establishments"),
    zones: firstOf("zones"),
    workSchedules: firstOf("workSchedules"),
    statuses: firstOf("statuses"),
  })

  // Los filtros se escriben dentro del input —`estado:(Activo)`— igual que en
  // el resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax: QuerySyntax<CampusFiltersFormInput> = {
    empty: { search: "", establishments: [], zones: [], workSchedules: [], statuses: [] },
    freeText: { key: "texto", field: "search" },
    terms: [
      ...(establishments.length > 1 ? [optionsTerm("establecimiento", "establishments", establishments)] : []),
      optionsTerm("zona", "zones", zones),
      optionsTerm("jornada", "workSchedules", workSchedules),
      optionsTerm("estado", "statuses", CAMPUS_STATUS_OPTIONS),
    ],
  }

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Los filtros avanzados se cuentan aparte del buscador para el badge.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) {
      setDraft({
        establishments: filters.establishments[0] ?? "",
        zones: filters.zones[0] ?? "",
        workSchedules: filters.workSchedules[0] ?? "",
        statuses: filters.statuses[0] ?? "",
      })
    }
  }, [open, filters.establishments, filters.zones, filters.workSchedules, filters.statuses])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    const asList = (value: string) => (value ? [value] : [])
    applyFilters({
      ...filters,
      search: freeText,
      establishments: asList(draft.establishments),
      zones: asList(draft.zones),
      workSchedules: asList(draft.workSchedules),
      statuses: asList(draft.statuses),
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const setDraftKey = (key: ListKey) => (value: string) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por nombre o código DANE antiguo"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        onApply={handleApplyAdvanced}
        size="sm"
      >
        <div className="grid grid-cols-2 gap-3 px-4">
          {establishments.length > 1 ? (
            <div className="col-span-2">
              <FilterCombobox
                id="campus-establishment"
                label="Establecimiento"
                emptyLabel="Todos"
                options={establishments}
                value={draft.establishments}
                onChange={setDraftKey("establishments")}
              />
            </div>
          ) : null}
          <FilterCombobox
            id="campus-zone"
            label="Zona"
            emptyLabel="Todas"
            options={zones}
            value={draft.zones}
            onChange={setDraftKey("zones")}
          />
          <FilterCombobox
            id="campus-work-schedule"
            label="Jornada"
            emptyLabel="Todas"
            options={workSchedules}
            value={draft.workSchedules}
            onChange={setDraftKey("workSchedules")}
          />
          <FilterCombobox
            id="campus-status"
            label="Estado"
            emptyLabel="Todos"
            options={CAMPUS_STATUS_OPTIONS}
            value={draft.statuses}
            onChange={setDraftKey("statuses")}
          />
        </div>
      </SearchQueryBar>
    </div>
  )
}
