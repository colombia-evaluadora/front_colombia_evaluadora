import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import type { ReservationFiltersFormInput, ReservationFiltersFormValues } from "@/features/coverage/api/schema"
import { FilterReservationsForm } from "@/features/coverage/components/forms/form-filter-reservations"
import { reservationsSyntax } from "@/features/coverage/components/search/query-syntax"

const FILTER_RESERVATIONS_FORM_ID = "filter-reservations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "reservations-search"

interface SearchReservationsProps {
  activeFilterCount: number
  filters: ReservationFiltersFormInput
  applyFilters: (values: ReservationFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchReservations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchReservationsProps) {
  const [open, setOpen] = useState(false)

  const { data: catalogs } = useReservationCatalogsQuery()

  // El input contiene la consulta entera —términos `clave:(valor)` más la
  // identificación, que es la búsqueda libre—. Ver `query-syntax.ts`.
  const { search, setSearch, freeText } = useQuerySearch({
    syntax: reservationsSyntax,
    filters,
    applyFilters,
  })

  // `filters` viene de la URL. El buscador por identificación se cuenta aparte
  // del badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.documentNumber ? 1 : 0)

  function handleApplyAdvanced(values: ReservationFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
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
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_RESERVATIONS_FORM_ID}
      >
        <FilterReservationsForm
          id={FILTER_RESERVATIONS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          catalogs={catalogs}
          hideDocumentNumber
        />
      </SearchQueryBar>
    </div>
  )
}
