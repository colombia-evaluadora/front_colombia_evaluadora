import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QueryOption, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import type { CalendarEntry } from "@/features/establishment/academic-period/api/types/academic-calendar"
import { CALENDAR_ENTRY_TYPE_LABELS } from "@/features/establishment/academic-period/utils/academic-calendar"

// Valor vacío de los selects = sin filtro ("Todos").
const ALL_VALUE = ""

export interface AcademicCalendarFilters {
  search: string
  origin: CalendarEntry["origin"] | ""
  type: CalendarEntry["type"] | ""
}

export const EMPTY_CALENDAR_FILTERS: AcademicCalendarFilters = { search: "", origin: "", type: "" }

const ORIGIN_OPTIONS: QueryOption[] = [
  { value: "FESTIVO", label: "Festivo" },
  { value: "REGISTRADO", label: "Registrado" },
]
const TYPE_OPTIONS: QueryOption[] = Object.entries(CALENDAR_ENTRY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)

interface SearchAcademicCalendarProps {
  filters: AcademicCalendarFilters
  onFiltersChange: (filters: AcademicCalendarFilters) => void
}

// Busca por Motivo y filtra por Origen y Tipo (Sección 5.8), como Asignaciones
// académicas. Los filtros viven en el estado del tab, no en la URL.
export function SearchAcademicCalendar({ filters, onFiltersChange }: SearchAcademicCalendarProps) {
  const [open, setOpen] = useState(false)

  const syntax: QuerySyntax<AcademicCalendarFilters> = {
    empty: EMPTY_CALENDAR_FILTERS,
    freeText: { key: "texto", field: "search" },
    terms: [optionTerm("origen", "origin", ORIGIN_OPTIONS), optionTerm("tipo", "type", TYPE_OPTIONS)],
  }

  const { search, setSearch } = useQuerySearch({
    syntax,
    filters,
    applyFilters: onFiltersChange,
  })

  const activeCount = [filters.origin, filters.type].filter((v) => v !== "").length

  function handleClearAll() {
    onFiltersChange(EMPTY_CALENDAR_FILTERS)
    setSearch("")
    setOpen(false)
  }

  const selects: { key: "origin" | "type"; label: string; options: QueryOption[] }[] = [
    { key: "origin", label: "Origen", options: ORIGIN_OPTIONS },
    { key: "type", label: "Tipo", options: TYPE_OPTIONS },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SearchQueryBar
        id="academic-calendar-search"
        label="Buscar"
        placeholder="Buscar por motivo"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeCount}
        badgeCount={activeCount}
        open={open}
        onOpenChange={setOpen}
        // Los filtros se aplican al vuelo: "Aplicar filtros" solo cierra el panel.
        onApply={() => setOpen(false)}
        size="sm"
        className="sm:w-[28rem]"
      >
        <div className="flex flex-col gap-4 px-4">
          {selects.map(({ key, label, options }) => {
            const id = `academic-calendar-${key}`
            return (
              <Field key={key} orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <ComboboxField
                  value={filters[key]}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, [key]: (value as string | null) ?? ALL_VALUE })
                  }
                >
                  <ComboboxFieldTrigger id={id} size="sm" className="w-full">
                    <ComboboxFieldValue placeholder="Todos">
                      {(value) => options.find((o) => o.value === value)?.label ?? "Todos"}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                      {options.map((option) => (
                        <ComboboxFieldItem key={option.value} value={option.value}>
                          {option.label}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )
          })}
        </div>
      </SearchQueryBar>
    </div>
  )
}
