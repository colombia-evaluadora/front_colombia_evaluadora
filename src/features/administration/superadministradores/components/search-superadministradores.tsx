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

import {
  EMPTY_SUPERADMINISTRADORES_FILTERS,
  type SuperadministradoresFilters,
} from "@/features/administration/superadministradores/hooks/use-superadministradores-filters"

const ESTADO_ITEMS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
]

interface SearchSuperadministradoresProps {
  filters: SuperadministradoresFilters
  applyFilters: (values: SuperadministradoresFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/** Buscador del listado: texto libre = nombre, documento o correo; `estado:(…)` en el popover. */
export function SearchSuperadministradores({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchSuperadministradoresProps) {
  const [open, setOpen] = useState(false)
  const [draftEstado, setDraftEstado] = useState<string>(filters.estado)

  const syntax: QuerySyntax<SuperadministradoresFilters> = {
    empty: EMPTY_SUPERADMINISTRADORES_FILTERS,
    freeText: { key: "texto", field: "q" },
    terms: [optionTerm("estado", "estado", ESTADO_ITEMS.slice(1))],
  }
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Al abrir, el popover arranca con el filtro vigente.
  useEffect(() => {
    if (open) setDraftEstado(filters.estado)
  }, [open, filters.estado])

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id="superadministradores-search"
        placeholder="Buscar por nombre, documento o correo"
        value={search}
        onValueChange={setSearch}
        onClearAll={() => {
          clearAllFilters()
          setSearch("")
          setOpen(false)
        }}
        activeFilterCount={activeFilterCount}
        badgeCount={activeFilterCount - (filters.q ? 1 : 0)}
        open={open}
        onOpenChange={setOpen}
        onApply={() => {
          applyFilters({
            q: freeText,
            estado: draftEstado as SuperadministradoresFilters["estado"],
          })
          setOpen(false)
        }}
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="superadministradores-estado">Estado</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(ESTADO_ITEMS.map((item) => [item.value, item.label]))}
              value={draftEstado}
              onValueChange={(next) => setDraftEstado(next ?? "")}
            >
              <ComboboxFieldTrigger id="superadministradores-estado" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {ESTADO_ITEMS.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>
      </SearchQueryBar>
    </div>
  )
}
