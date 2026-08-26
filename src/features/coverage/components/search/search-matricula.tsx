import { useEffect, useMemo, useState } from "react"

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

import { MATRICULA_STATUSES, type MatriculaFiltersFormInput } from "@/features/coverage/api/schema"
import { MATRICULA_STATUS_LABELS } from "@/features/coverage/api/ui-mappings-matricula"
import { toSelectItemsMap } from "@/lib/catalog-options"

const SEARCH_INPUT_ID = "matricula-search"

const STATUS_OPTIONS = MATRICULA_STATUSES.map((status) => ({
  value: status,
  label: MATRICULA_STATUS_LABELS[status],
}))

interface SearchMatriculaProps {
  filters: MatriculaFiltersFormInput
  applyFilters: (values: MatriculaFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function SearchMatricula({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchMatriculaProps) {
  const [open, setOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")

  // Igual que en establecimientos: el estado se escribe dentro del input,
  // `estado:(Activo)`. Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<MatriculaFiltersFormInput>>(
    () => ({
      empty: { search: "", statuses: [] },
      freeText: { key: "texto", field: "search" },
      terms: [optionsTerm("estado", "statuses", STATUS_OPTIONS)],
    }),
    [],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  useEffect(() => {
    if (open) setDraftStatus(filters.statuses[0] ?? "")
  }, [open, filters.statuses])

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search: freeText,
      statuses: draftStatus ? [draftStatus as MatriculaFiltersFormInput["statuses"][number]] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const statusItems = [{ value: "", label: "Todos" }, ...STATUS_OPTIONS]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por"
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
        <div className="px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-status">Estado</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(statusItems)}
              value={draftStatus}
              onValueChange={(value) => setDraftStatus(value ?? "")}
            >
              <ComboboxFieldTrigger id="matricula-status" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {statusItems.map((item) => (
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
