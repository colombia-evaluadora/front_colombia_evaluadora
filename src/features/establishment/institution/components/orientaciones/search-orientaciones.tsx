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

import {
  ESTADOS_ORIENTACION,
  type EstadoOrientacionRecibida,
  type OrientacionesFiltersFormInput,
} from "@/features/establishment/institution/api/schema"
import {
  ESTADO_ORIENTACION_UI,
  TEMAS_ORIENTACION_RECIBIDA,
} from "@/features/establishment/institution/utils/orientaciones"

const SEARCH_INPUT_ID = "orientaciones-recibidas-search"

const ESTADO_OPTIONS = ESTADOS_ORIENTACION.map((value) => ({
  value,
  label: ESTADO_ORIENTACION_UI[value].label,
}))
const TEMA_OPTIONS = TEMAS_ORIENTACION_RECIBIDA.map((tema) => ({ value: tema, label: tema }))

interface SearchOrientacionesProps {
  filters: OrientacionesFiltersFormInput
  applyFilters: (values: OrientacionesFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/** Buscador por texto de la orientación, con los filtros Estado y Tema (E.1.ORI.3). */
export function SearchOrientaciones({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchOrientacionesProps) {
  const [open, setOpen] = useState(false)
  const [draftEstado, setDraftEstado] = useState<string>(filters.estados[0] ?? "")
  const [draftTema, setDraftTema] = useState(filters.temas[0] ?? "")

  // `estado:(Enviada) tema:(Extraedad) texto`, como el resto de los listados.
  const syntax: QuerySyntax<OrientacionesFiltersFormInput> = {
    empty: { search: "", estados: [], temas: [] },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionsTerm("estado", "estados", ESTADO_OPTIONS),
      optionsTerm("tema", "temas", TEMA_OPTIONS),
    ],
  }

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) {
      setDraftEstado(filters.estados[0] ?? "")
      setDraftTema(filters.temas[0] ?? "")
    }
  }, [open, filters.estados, filters.temas])

  function handleApplyAdvanced() {
    applyFilters({
      search: freeText,
      estados: draftEstado ? [draftEstado as EstadoOrientacionRecibida] : [],
      temas: draftTema ? [draftTema] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const estadoItems = [{ value: "", label: "Todos" }, ...ESTADO_OPTIONS]
  const temaItems = [{ value: "", label: "Todos" }, ...TEMA_OPTIONS]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por texto de la orientación"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        onClearFilters={() => {
          setDraftEstado("")
          setDraftTema("")
        }}
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
              <FieldLabel htmlFor="orientaciones-estado">Estado</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(estadoItems)}
                value={draftEstado}
                onValueChange={(value) => setDraftEstado(value ?? "")}
              >
                <ComboboxFieldTrigger id="orientaciones-estado" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {estadoItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>

            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="orientaciones-tema">Tema</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(temaItems)}
                value={draftTema}
                onValueChange={(value) => setDraftTema(value ?? "")}
              >
                <ComboboxFieldTrigger id="orientaciones-tema" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {temaItems.map((item) => (
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
