import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import type { ReservationFiltersFormInput, ReservationFiltersFormValues } from "@/features/coverage/api/schema"
import { FilterReservationsForm } from "@/features/coverage/components/forms/form-filter-reservations"
import { enrollmentsSyntax } from "@/features/coverage/components/search/query-syntax-enrollments"

const FILTER_ENROLLMENTS_FORM_ID = "filter-enrollments-form"

const SEARCH_INPUT_ID = "enrollments-search"

interface SearchEnrollmentsProps {
  activeFilterCount: number
  filters: ReservationFiltersFormInput
  applyFilters: (values: ReservationFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchEnrollments({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchEnrollmentsProps) {
  const [open, setOpen] = useState(false)

  const { data: catalogs } = useReservationCatalogsQuery()

  const { search, setSearch, freeText } = useQuerySearch({
    syntax: enrollmentsSyntax,
    filters,
    applyFilters,
  })

  const advancedFilterCount = activeFilterCount - (filters.documentNumber ? 1 : 0)

  function handleApplyAdvanced(values: ReservationFiltersFormValues) {
    applyFilters({ ...values, documentNumber: freeText })
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
        label="Buscar nombre, apellido o número de identificación"
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_ENROLLMENTS_FORM_ID}
      >
        <FilterReservationsForm
          id={FILTER_ENROLLMENTS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          catalogs={catalogs}
          hideDocumentNumber
        />
      </SearchQueryBar>
    </div>
  )
}
