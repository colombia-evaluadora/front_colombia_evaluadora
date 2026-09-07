import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"

import type {
  PlaneadorFiltersFormInput,
  PlaneadorFiltersFormValues,
} from "@/features/planeador/api/schema"
import { ESTADO_OPTIONS } from "@/features/planeador/api/ui-mappings"
import { FilterPlaneadorForm } from "@/features/planeador/components/forms/form-filter-planeador"
import { VIEW_OPTIONS } from "@/features/planeador/components/view-options"

const FILTER_PLANEADOR_FORM_ID = "filter-planeador-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "planeador-search"

interface SearchPlaneadorProps {
  activeFilterCount: number
  filters: PlaneadorFiltersFormInput
  applyFilters: (values: PlaneadorFiltersFormValues) => void
  clearAllFilters: () => void
  // Catálogo `INSTRUMENTO_EVALUACION` (`TLISTA_VALOR`, ver
  // `use-instrumento-evaluacion-catalog.ts`) — nombre y valor son el mismo
  // string, igual que el resto de catálogos "planos" del Planeador. Opcional:
  // la pestaña "Unidad temática" comparte este buscador pero no tiene
  // instrumento que filtrar.
  instrumentoOptions?: string[]
}

/**
 * Buscador del Planeador: un solo input con la consulta y el embudo de
 * filtros avanzados detrás, igual que sedes, empleados o periodos. Reemplaza
 * a los tres selects sueltos que tenía la barra antes — lo que ahí eran
 * campos fijos ahora son términos escribibles (`estado:(Pendiente)`) o
 * controles del panel.
 */
export function SearchPlaneador({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
  instrumentoOptions = [],
}: SearchPlaneadorProps) {
  const [open, setOpen] = useState(false)

  // Ver `@/components/search/query-syntax`: el texto sin clave va a `buscar`
  // y cada filtro avanzado tiene la suya.
  const syntax = useMemo<QuerySyntax<PlaneadorFiltersFormInput>>(
    () => ({
      empty: { buscar: "", filtro: "", estado: "", vista: "" },
      freeText: { key: "actividad", field: "buscar" },
      terms: [
        optionTerm("estado", "estado", [...ESTADO_OPTIONS]),
        optionTerm(
          "instrumento",
          "filtro",
          instrumentoOptions.map((nombre) => ({ value: nombre, label: nombre })),
        ),
        optionTerm("ver", "vista", [...VIEW_OPTIONS]),
      ],
    }),
    [instrumentoOptions],
  )

  const { search, setSearch, freeText } = useQuerySearch({
    syntax,
    filters,
    applyFilters,
  })

  // El badge del embudo cuenta solo los filtros del panel, no la búsqueda
  // libre —esa ya se ve escrita en el input—.
  const advancedFilterCount = activeFilterCount - (filters.buscar ? 1 : 0)

  function handleApplyAdvanced(values: PlaneadorFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...values, buscar: freeText })
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
        label="Buscar por nombre, unidad, estado o instrumento…"
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_PLANEADOR_FORM_ID}
      >
        <FilterPlaneadorForm
          id={FILTER_PLANEADOR_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          instrumentoOptions={instrumentoOptions}
        />
      </SearchQueryBar>
    </div>
  )
}
