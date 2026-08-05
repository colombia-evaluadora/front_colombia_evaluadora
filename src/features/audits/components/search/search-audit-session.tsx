import { useEffect, useRef, useState } from "react"
import {
  EraserIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
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
  AuditFiltersFormInput,
  AuditFiltersFormValues,
} from "../../api/schema"
import type { SessionStatus } from "../../api/types/audit"
import { useAuditSessionStatusesQuery } from "../../api/query/use-audit-session-statuses-query"
import { FilterAuditSessionForm } from "../forms/form-filter-audit-session"

const FILTER_AUDIT_SESSION_FORM_ID = "filter-audit-session-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "audit-session-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchAuditSessionProps {
  activeFilterCount: number
  filters: AuditFiltersFormInput
  applyFilters: (values: AuditFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchAuditSession({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchAuditSessionProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.author)

  const { data: statusOptions = [] } = useAuditSessionStatusesQuery()

  // `filters` viene de la URL. El buscador de autor se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.author ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters })
  latest.current = { filters, applyFilters }

  // Sincroniza cambios externos (p. ej. "Limpiar todo") hacia el input.
  useEffect(() => {
    setSearch(filters.author)
  }, [filters.author])

  // Aplica el buscador (por autor) con retardo, preservando los avanzados.
  useEffect(() => {
    if (search === latest.current.filters.author) return
    const timeout = setTimeout(() => {
      const { filters, applyFilters } = latest.current
      applyFilters({ ...filters, author: search })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  function handleApplyAdvanced(values: AuditFiltersFormValues) {
    // El buscador es la fuente de verdad del autor; conservamos su valor.
    applyFilters({ ...values, author: search })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Quita un único filtro avanzado, preservando el resto y el buscador.
  function removeFilter(
    field: keyof AuditFiltersFormValues,
    payload?: SessionStatus,
  ) {
    if (field === "statuses" && payload) {
      applyFilters({
        ...filters,
        statuses: filters.statuses.filter((s) => s !== payload),
      })
      return
    }
    applyFilters({ ...filters, [field]: "" })
  }

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover. El autor vive en el buscador, no acá.
  const activeChips: {
    key: string
    label: string
    field: keyof AuditFiltersFormValues
    payload?: SessionStatus
  }[] = []
  for (const status of filters.statuses) {
    activeChips.push({
      key: `status-${status}`,
      field: "statuses",
      payload: status,
      label: `Estado: ${
        statusOptions.find((o) => o.key === status)?.label ?? status
      }`,
    })
  }
  if (filters.startedFrom) {
    activeChips.push({
      key: "startedFrom",
      field: "startedFrom",
      label: `Desde: ${filters.startedFrom}`,
    })
  }
  if (filters.startedTo) {
    activeChips.push({
      key: "startedTo",
      field: "startedTo",
      label: `Hasta: ${filters.startedTo}`,
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
          placeholder="Buscar por autor o IP…"
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
                <FilterAuditSessionForm
                  id={FILTER_AUDIT_SESSION_FORM_ID}
                  defaultValues={filters}
                  onSubmit={handleApplyAdvanced}
                  hideAuthor
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
                  form={FILTER_AUDIT_SESSION_FORM_ID}
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
                onClick={() => removeFilter(chip.field, chip.payload)}
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
