import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, textTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import type {
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../../../api/schema"
import { useAcademicPeriodStatusesQuery } from "../../../api/query/academic-period/use-academic-period-statuses-query"
import { FilterAcademicPeriodsForm } from "../forms/form-filter-academic-periods"

const FILTER_ACADEMIC_PERIODS_FORM_ID = "filter-academic-periods-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "academic-periods-search"

interface SearchAcademicPeriodsProps {
  activeFilterCount: number
  filters: AcademicPeriodsFiltersFormInput
  applyFilters: (values: AcademicPeriodsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchAcademicPeriods({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchAcademicPeriodsProps) {
  const [open, setOpen] = useState(false)

  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()

  // Los filtros se escriben dentro del input —`año:(2026) estado:(Abierto)`—
  // igual que en el resto de los listados.
  // Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<AcademicPeriodsFiltersFormInput>>(
    () => ({
      empty: { sedeName: "", schoolYearId: "", status: "", startFrom: "", startTo: "" },
      freeText: { key: "sede", field: "sedeName" },
      terms: [
        textTerm("año", "schoolYearId"),
        optionTerm(
          "estado",
          "status",
          statusOptions.map((option) => ({ value: option.key, label: option.label })),
        ),
        textTerm("desde", "startFrom"),
        textTerm("hasta", "startTo"),
      ],
    }),
    [statusOptions],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // `filters` viene de la URL. Los filtros avanzados (año, estado, fechas) se
  // cuentan aparte del buscador de sede para el badge del botón.
  const advancedFilterCount = activeFilterCount - (filters.sedeName ? 1 : 0)

  function handleApplyAdvanced(values: AcademicPeriodsFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...values, sedeName: freeText })
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
        placeholder="Buscar por sede…"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_ACADEMIC_PERIODS_FORM_ID}
      >
        <FilterAcademicPeriodsForm
          id={FILTER_ACADEMIC_PERIODS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          hideSede
        />
      </SearchQueryBar>
    </div>
  )
}
