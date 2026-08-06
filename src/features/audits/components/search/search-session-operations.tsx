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
  SessionOperationsFiltersFormInput,
  SessionOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { FilterSessionOperationsForm } from "../forms/form-filter-session-operations"

const FILTER_SESSION_OPERATIONS_FORM_ID = "filter-session-operations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "session-operations-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchSessionOperationsProps {
  activeFilterCount: number
  filters: SessionOperationsFiltersFormInput
  applyFilters: (values: SessionOperationsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchSessionOperations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchSessionOperationsProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.tableSlug)

  const { data: operationOptions = [] } = useAuditOperationTypesQuery()

  // `filters` viene de la URL. El buscador de tabla se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.tableSlug ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters })
  latest.current = { filters, applyFilters }

  // Sincroniza cambios externos (p. ej. "Limpiar todo") hacia el input.
  useEffect(() => {
    setSearch(filters.tableSlug)
  }, [filters.tableSlug])

  // Aplica el buscador (por tabla) con retardo, preservando los avanzados.
  useEffect(() => {
    if (search === latest.current.filters.tableSlug) return
    const timeout = setTimeout(() => {
      const { filters, applyFilters } = latest.current
      applyFilters({ ...filters, tableSlug: search })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  function handleApplyAdvanced(values: SessionOperationsFiltersFormValues) {
    // El buscador es la fuente de verdad de la tabla; conservamos su valor.
    applyFilters({ ...values, tableSlug: search })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Quita un único filtro avanzado, preservando el resto y el buscador.
  function removeOperation(operation: OperationType) {
    applyFilters({
      ...filters,
      operations: filters.operations.filter((o) => o !== operation),
    })
  }

  // La X de la barra limpia todo —texto y filtros—, así que solo aparece
  // cuando hay algo que limpiar.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover. La tabla vive en el buscador, no acá.
  const activeChips: {
    key: string
    label: string
    onRemove: () => void
  }[] = []
  for (const operation of filters.operations) {
    activeChips.push({
      key: `operation-${operation}`,
      label: `Operación: ${
        operationOptions.find((o) => o.key === operation)?.label ?? operation
      }`,
      onRemove: () => removeOperation(operation),
    })
  }
  if (filters.occurredFrom) {
    activeChips.push({
      key: "occurredFrom",
      label: `Desde: ${filters.occurredFrom}`,
      onRemove: () => applyFilters({ ...filters, occurredFrom: "" }),
    })
  }
  if (filters.occurredTo) {
    activeChips.push({
      key: "occurredTo",
      label: `Hasta: ${filters.occurredTo}`,
      onRemove: () => applyFilters({ ...filters, occurredTo: "" }),
    })
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/*
        El `Field` outlined solo aporta la etiqueta flotante: el borde y el
        foco los sigue pintando el propio `InputGroup`. Sin `aria-label` en el
        control, para que el nombre accesible lo dé la etiqueta visible.
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
          placeholder="Buscar por tabla…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            formId={FILTER_SESSION_OPERATIONS_FORM_ID}
          >
            <FilterSessionOperationsForm
              id={FILTER_SESSION_OPERATIONS_FORM_ID}
              defaultValues={filters}
              onSubmit={handleApplyAdvanced}
              hideTableSlug
            />
          </AdvancedFiltersPopover>
        </InputGroupAddon>
        </InputGroup>
      </Field>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-secondary/60 py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Quitar filtro ${chip.label}`}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                onClick={chip.onRemove}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="ml-1 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={handleClearAll}
          >
            Limpiar todo
          </button>
        </div>
      )}
    </div>
  )
}
