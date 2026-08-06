import { useEffect, useRef, useState } from "react"
import {
  EraserIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
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
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../../../api/schema"
import { useAcademicPeriodStatusesQuery } from "../../../api/query/academic-period/use-academic-period-statuses-query"
import { FilterAcademicPeriodsForm } from "../forms/form-filter-academic-periods"

const FILTER_ACADEMIC_PERIODS_FORM_ID = "filter-academic-periods-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "academic-periods-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchAcademicPeriodsProps {
  activeFilterCount: number
  filters: AcademicPeriodsFiltersFormInput
  applyFilters: (values: AcademicPeriodsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchAcademicPeriods({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchAcademicPeriodsProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.sedeName)

  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()

  // `filters` viene de la URL. Los filtros avanzados (año, estado, fechas) se
  // cuentan aparte del buscador de sede para el badge del botón.
  const advancedFilterCount = activeFilterCount - (filters.sedeName ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters })
  latest.current = { filters, applyFilters }

  // Sincroniza cambios externos (p. ej. "Limpiar todo") hacia el input.
  useEffect(() => {
    setSearch(filters.sedeName)
  }, [filters.sedeName])

  // Aplica el buscador (por sede) con retardo, preservando los avanzados.
  useEffect(() => {
    if (search === latest.current.filters.sedeName) return
    const timeout = setTimeout(() => {
      const { filters, applyFilters } = latest.current
      applyFilters({ ...filters, sedeName: search })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  function handleApplyAdvanced(values: AcademicPeriodsFiltersFormValues) {
    // El buscador es la fuente de verdad de la sede; conservamos su valor.
    applyFilters({ ...values, sedeName: search })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Quita un único filtro avanzado, preservando el resto y el buscador.
  function removeFilter(field: keyof AcademicPeriodsFiltersFormValues) {
    applyFilters({ ...filters, [field]: "" })
  }

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover. La sede vive en el buscador, no acá.
  const activeChips: {
    key: keyof AcademicPeriodsFiltersFormValues
    label: string
  }[] = []
  if (filters.schoolYearId) {
    activeChips.push({
      key: "schoolYearId",
      label: `Año: ${filters.schoolYearId}`,
    })
  }
  if (filters.status) {
    activeChips.push({
      key: "status",
      label: `Estado: ${
        statusOptions.find((o) => o.key === filters.status)?.label ??
        filters.status
      }`,
    })
  }
  if (filters.startFrom) {
    activeChips.push({ key: "startFrom", label: `Desde: ${filters.startFrom}` })
  }
  if (filters.startTo) {
    activeChips.push({ key: "startTo", label: `Hasta: ${filters.startTo}` })
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
        placeholder="Buscar por sede…"
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
          formId={FILTER_ACADEMIC_PERIODS_FORM_ID}
        >
          <FilterAcademicPeriodsForm
            id={FILTER_ACADEMIC_PERIODS_FORM_ID}
            defaultValues={filters}
            onSubmit={handleApplyAdvanced}
            hideSede
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
                onClick={() => removeFilter(chip.key)}
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
