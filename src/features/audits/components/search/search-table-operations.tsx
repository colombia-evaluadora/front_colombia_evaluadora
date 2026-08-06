import { useEffect, useRef, useState } from "react"
import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { AdvancedFiltersPopover } from "@/components/search/advanced-filters-popover"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

import type {
  TableOperationsFiltersFormInput,
  TableOperationsFiltersFormValues,
} from "../../api/schema"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { FilterTableOperationsForm } from "../forms/form-filter-table-operations"
import { buildQuery, parseQuery, sameFilters } from "./query-syntax"

const FILTER_TABLE_OPERATIONS_FORM_ID = "filter-table-operations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "table-operations-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchTableOperationsProps {
  activeFilterCount: number
  filters: TableOperationsFiltersFormInput
  applyFilters: (values: TableOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  // Campos de la tabla auditada — se inyectan en el form para el dropdown
  // de filtros por campo.
  availableFields: string[]
}

export function SearchTableOperations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
  availableFields,
}: SearchTableOperationsProps) {
  const [open, setOpen] = useState(false)

  const { data: operationOptions = [] } = useAuditOperationTypesQuery()

  // El input contiene la consulta entera —términos `clave:(valor)` más la
  // búsqueda libre—, no solo el autor. Ver `query-syntax.ts`.
  const queryFromFilters = buildQuery(filters, operationOptions)
  const [search, setSearch] = useState(queryFromFilters)

  // `filters` viene de la URL. El buscador de autor se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.author ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters, operationOptions })
  latest.current = { filters, applyFilters, operationOptions }

  // Sincroniza hacia el input los cambios que no vienen de teclear: el
  // popover, "limpiar todo", el botón atrás del navegador. La guarda evita
  // pisar lo escrito cuando el texto ya significa lo mismo que los filtros
  // (si no, normalizar el espaciado movería el cursor al final en cada tecla).
  useEffect(() => {
    setSearch((current) =>
      sameFilters(parseQuery(current, latest.current.operationOptions), latest.current.filters)
        ? current
        : queryFromFilters,
    )
  }, [queryFromFilters])

  // Aplica la consulta escrita, con retardo para no navegar en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const { filters, applyFilters, operationOptions } = latest.current
      const parsed = parseQuery(search, operationOptions)
      if (sameFilters(parsed, filters)) return
      applyFilters(parsed)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  function handleApplyAdvanced(values: TableOperationsFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el efecto de arriba la vuelca al input.
    applyFilters({ ...values, author: parseQuery(search, operationOptions).author })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Hay algo que limpiar si el usuario escribió en el buscador o si quedó
  // algún filtro avanzado puesto.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/*
        El `Field` outlined solo aporta la etiqueta flotante: el borde y el
        foco los sigue pintando el propio `InputGroup`. Sin `aria-label` en el
        control, para que el nombre accesible lo dé la etiqueta visible.

        Los filtros activos son literalmente el texto del input, en la sintaxis
        de `query-syntax.ts`: el buscador y los filtros son una sola consulta,
        y quitar un filtro es borrar sus caracteres.
      */}
      <Field orientation="vertical" variant="outlined" className="w-full max-w-xl">
        <FieldLabel htmlFor={SEARCH_INPUT_ID}>Buscar</FieldLabel>
        <InputGroup className="h-9 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
          <InputGroupAddon align="inline-start" className="ml-2">
            <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
          </InputGroupAddon>

          <InputGroupInput
            id={SEARCH_INPUT_ID}
            type="search"
            autoComplete="off"
            placeholder="Buscar en la auditoría…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // La X que Chrome inyecta en los `type="search"` duplicaba a la
            // nuestra —y con otro estilo—, así que se apaga y queda una sola
            // forma de limpiar.
            className="min-w-32 [&::-webkit-search-cancel-button]:appearance-none"
          />

          <InputGroupAddon align="inline-end" className="mr-1 gap-1">
            {hasAnythingToClear && (
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                color="muted"
                aria-label="Limpiar búsqueda y filtros"
                onClick={handleClearAll}
              >
                <XIcon />
              </InputGroupButton>
            )}

            <AdvancedFiltersPopover
              open={open}
              onOpenChange={setOpen}
              activeFilterCount={activeFilterCount}
              badgeCount={advancedFilterCount}
              formId={FILTER_TABLE_OPERATIONS_FORM_ID}
            >
              <FilterTableOperationsForm
                id={FILTER_TABLE_OPERATIONS_FORM_ID}
                defaultValues={filters}
                onSubmit={handleApplyAdvanced}
                availableFields={availableFields}
                hideAuthor
              />
            </AdvancedFiltersPopover>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </div>
  )
}
