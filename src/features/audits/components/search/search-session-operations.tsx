import { useEffect, useRef, useState } from "react"
import {
  EraserIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

import type {
  SessionOperationsFiltersFormInput,
  SessionOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { FilterSessionOperationsForm } from "../forms/form-filter-session-operations"

const FILTER_SESSION_OPERATIONS_FORM_ID = "filter-session-operations-form"

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
      <InputGroup className="h-9 w-full max-w-xl rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
        <InputGroupAddon align="inline-start" className="ml-2">
          <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
        </InputGroupAddon>

        <InputGroupInput
          type="search"
          autoComplete="off"
          placeholder="Buscar por tabla…"
          aria-label="Buscar por tabla"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <InputGroupAddon align="inline-end" className="mr-1 gap-1">
          {search && (
            <InputGroupButton
              size="icon-xs"
              aria-label="Limpiar búsqueda"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setSearch("")}
            >
              <XIcon />
            </InputGroupButton>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  variant={activeFilterCount > 0 ? "soft" : "ghost"}
                  color={activeFilterCount > 0 ? "secondary" : undefined}
                  aria-label="Filtros"
                  aria-pressed={activeFilterCount > 0}
                  className="relative text-muted-foreground hover:text-primary aria-pressed:text-secondary-foreground"
                />
              }
            >
              <FunnelIcon />
              {advancedFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[0.55rem] font-semibold text-primary-foreground">
                  {advancedFilterCount}
                </span>
              )}
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 gap-3 p-0">
              <PopoverHeader className="border-b p-4">
                <PopoverTitle>Filtros</PopoverTitle>
              </PopoverHeader>

              <div className="max-h-[60dvh] overflow-y-auto py-4">
                <FilterSessionOperationsForm
                  id={FILTER_SESSION_OPERATIONS_FORM_ID}
                  defaultValues={filters}
                  onSubmit={handleApplyAdvanced}
                  hideTableSlug
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t p-4">
                <Button
                  type="button"
                  color="muted"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={activeFilterCount === 0}
                >
                  <EraserIcon data-icon="inline-start" />
                  Limpiar todo
                </Button>
                <Button
                  type="submit"
                  form={FILTER_SESSION_OPERATIONS_FORM_ID}
                  color="primary"
                  size="sm"
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>

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
