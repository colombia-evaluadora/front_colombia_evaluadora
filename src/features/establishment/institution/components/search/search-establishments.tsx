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

import type { EstablishmentFiltersFormInput } from "@/features/establishment/institution/api/schema"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Municipality } from "@/features/establishment/institution/api/types/location"
import { toSearchOptions, toSelectItemsMap } from "@/lib/catalog-options"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "establishments-search"

interface SearchEstablishmentsProps {
  filters: EstablishmentFiltersFormInput
  applyFilters: (values: EstablishmentFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  municipalities: Municipality[]
  sectors: CatalogItem[]
}

/** Buscador por nombre, código DANE o NIT, con los filtros Municipio y Sector. */
export function SearchEstablishments({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  municipalities,
  sectors,
}: SearchEstablishmentsProps) {
  const [open, setOpen] = useState(false)
  const [draftMunicipality, setDraftMunicipality] = useState(filters.municipalities[0] ?? "")
  const [draftSector, setDraftSector] = useState(filters.sectors[0] ?? "")

  // El municipio va por su código DANE, que es lo que filtra el backend.
  const municipalityOptions = municipalities.filter((m) => m.code).map((m) => ({
    value: m.code as string,
    label: `${m.name} (${m.department.name})`,
  }))
  const sectorOptions = toSearchOptions(sectors)

  // Los filtros se escriben dentro del input —`sector:(Oficial)`— igual que en
  // el resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax: QuerySyntax<EstablishmentFiltersFormInput> = {
    empty: { search: "", municipalities: [], sectors: [] },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionsTerm("municipio", "municipalities", municipalityOptions),
      optionsTerm("sector", "sectors", sectorOptions),
    ],
  }

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Los filtros avanzados se cuentan aparte del buscador para el badge.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) {
      setDraftMunicipality(filters.municipalities[0] ?? "")
      setDraftSector(filters.sectors[0] ?? "")
    }
  }, [open, filters.municipalities, filters.sectors])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({
      ...filters,
      search: freeText,
      municipalities: draftMunicipality ? [draftMunicipality] : [],
      sectors: draftSector ? [draftSector] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const municipalityItems = [{ value: "", label: "Todos" }, ...municipalityOptions]
  const sectorItems = [{ value: "", label: "Todos" }, ...sectorOptions]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por nombre, código DANE o NIT"
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
          <div className="grid grid-cols-2 gap-3">
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="establishment-municipality">Municipio</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(municipalityItems)}
                value={draftMunicipality}
                onValueChange={(value) => setDraftMunicipality(value ?? "")}
              >
                <ComboboxFieldTrigger id="establishment-municipality" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {municipalityItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>

            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="establishment-sector">Sector</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(sectorItems)}
                value={draftSector}
                onValueChange={(value) => setDraftSector(value ?? "")}
              >
                <ComboboxFieldTrigger id="establishment-sector" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {sectorItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          </div>
        </div>
      </SearchQueryBar>
    </div>
  )
}
