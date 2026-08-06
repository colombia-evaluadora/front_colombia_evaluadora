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

import { useReservationCatalogsQuery } from "../../api/query/use-reservation-catalogs-query"
import type {
  ReservationFiltersFormInput,
  ReservationFiltersFormValues,
} from "../../api/schema"
import {
  EDUCATION_LEVEL_LABELS,
  RESERVATION_GROUP_BY_LABELS,
  RESERVATION_STATUS_LABELS,
  SHIFT_LABELS,
  formatGrade,
} from "../../api/ui-mappings"
import type {
  EducationLevel,
  ReservationGroupBy,
  ReservationStatus,
  Shift,
} from "../../api/types/reservation"
import { FilterReservationsForm } from "../forms/form-filter-reservations"

const FILTER_RESERVATIONS_FORM_ID = "filter-reservations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "reservations-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchReservationsProps {
  activeFilterCount: number
  filters: ReservationFiltersFormInput
  applyFilters: (values: ReservationFiltersFormValues) => void
  clearAllFilters: () => void
}

// Los chips describen un filtro avanzado y saben cómo quitarse: `patch` es lo
// que hay que sobreescribir en los filtros actuales para sacarlo.
interface FilterChip {
  key: string
  label: string
  patch: Partial<ReservationFiltersFormValues>
}

export function SearchReservations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchReservationsProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.documentNumber)

  const { data: catalogs } = useReservationCatalogsQuery()

  // `filters` viene de la URL. El buscador por identificación se cuenta aparte
  // del badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.documentNumber ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters })
  latest.current = { filters, applyFilters }

  // Sincroniza cambios externos (p. ej. "Limpiar todo") hacia el input.
  useEffect(() => {
    setSearch(filters.documentNumber)
  }, [filters.documentNumber])

  // Aplica el buscador con retardo, preservando los filtros avanzados.
  useEffect(() => {
    if (search === latest.current.filters.documentNumber) return
    const timeout = setTimeout(() => {
      const { filters, applyFilters } = latest.current
      applyFilters({ ...filters, documentNumber: search })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  function handleApplyAdvanced(values: ReservationFiltersFormValues) {
    // El buscador es la fuente de verdad de la identificación.
    applyFilters({ ...values, documentNumber: search })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Quita un único filtro avanzado, preservando el resto y el buscador.
  function removeFilter(patch: Partial<ReservationFiltersFormValues>) {
    applyFilters({ ...filters, ...patch })
  }

  // La X de la barra limpia todo —texto y filtros—, así que solo aparece
  // cuando hay algo que limpiar.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover. La identificación vive en el buscador.
  const activeChips: FilterChip[] = []
  if (filters.firstName) {
    activeChips.push({
      key: "firstName",
      label: `Nombre: ${filters.firstName}`,
      patch: { firstName: "" },
    })
  }
  if (filters.lastName) {
    activeChips.push({
      key: "lastName",
      label: `Apellido: ${filters.lastName}`,
      patch: { lastName: "" },
    })
  }
  if (filters.institution) {
    activeChips.push({
      key: "institution",
      label: `Institución: ${filters.institution}`,
      patch: { institution: "" },
    })
  }
  if (filters.campus) {
    activeChips.push({
      key: "campus",
      label: `Sede: ${filters.campus}`,
      patch: { campus: "" },
    })
  }
  if (filters.grade) {
    activeChips.push({
      key: "grade",
      label: `Grado: ${formatGrade(Number(filters.grade))}`,
      patch: { grade: "" },
    })
  }
  if (filters.group) {
    activeChips.push({
      key: "group",
      label: `Grupo: ${filters.group}`,
      patch: { group: "" },
    })
  }
  for (const shift of filters.shifts) {
    activeChips.push({
      key: `shift-${shift}`,
      label: `Jornada: ${SHIFT_LABELS[shift as Shift]}`,
      patch: { shifts: filters.shifts.filter((s) => s !== shift) },
    })
  }
  for (const level of filters.levels) {
    activeChips.push({
      key: `level-${level}`,
      label: `Nivel: ${EDUCATION_LEVEL_LABELS[level as EducationLevel]}`,
      patch: { levels: filters.levels.filter((l) => l !== level) },
    })
  }
  for (const status of filters.statuses) {
    activeChips.push({
      key: `status-${status}`,
      label: `Estado: ${RESERVATION_STATUS_LABELS[status as ReservationStatus]}`,
      patch: { statuses: filters.statuses.filter((s) => s !== status) },
    })
  }
  if (filters.reservedFrom || filters.reservedTo) {
    activeChips.push({
      key: "reserved",
      label: `Reserva: ${filters.reservedFrom || "…"} — ${filters.reservedTo || "…"}`,
      patch: { reservedFrom: "", reservedTo: "" },
    })
  }
  if (filters.groupBy) {
    activeChips.push({
      key: "groupBy",
      label: `Agrupado por: ${RESERVATION_GROUP_BY_LABELS[filters.groupBy as ReservationGroupBy]}`,
      patch: { groupBy: "" },
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
            inputMode="numeric"
            autoComplete="off"
            placeholder="Buscar por N° de identificación…"
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
              formId={FILTER_RESERVATIONS_FORM_ID}
            >
              <FilterReservationsForm
                id={FILTER_RESERVATIONS_FORM_ID}
                defaultValues={filters}
                onSubmit={handleApplyAdvanced}
                catalogs={catalogs}
                hideDocumentNumber
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
                onClick={() => removeFilter(chip.patch)}
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
