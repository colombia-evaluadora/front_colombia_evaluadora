import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import {
  paymentFiltersFormSchema,
  type PaymentFiltersFormInput,
  type PaymentFiltersFormValues,
} from "../../api/schema"
import { FilterPaymentsForm } from "../forms/form-filter-payments"
import { paymentsSyntax } from "./query-syntax"

const FILTER_PAYMENTS_FORM_ID = "filter-payments-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "payments-search"

interface SearchPaymentsProps {
  activeFilterCount: number
  filters: PaymentFiltersFormInput
  applyFilters: (values: PaymentFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchPayments({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchPaymentsProps) {
  const [open, setOpen] = useState(false)

  // El input contiene la consulta entera —términos `clave:(valor)` más el
  // email, que es la búsqueda libre—. Ver `query-syntax.ts`.
  const { search, setSearch, freeText } = useQuerySearch({
    syntax: paymentsSyntax,
    filters,
    // `filters` es el "input" del schema (montos como string); `applyFilters`
    // espera la salida ya parseada.
    applyFilters: (parsed) => applyFilters(paymentFiltersFormSchema.parse(parsed)),
  })

  // `filters` viene de la URL. El buscador de email se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.email ? 1 : 0)

  function handleApplyAdvanced(values: PaymentFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...values, email: freeText })
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
        placeholder="Buscar por email…"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_PAYMENTS_FORM_ID}
      >
        <FilterPaymentsForm
          id={FILTER_PAYMENTS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          hideEmail
        />
      </SearchQueryBar>
    </div>
  )
}
