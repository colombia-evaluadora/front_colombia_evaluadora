import { useEffect, useRef, useState } from "react"

import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
import { AdvancedFiltersPopover } from "@/components/search/advanced-filters-popover"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CampusFiltersFormInput } from "../../api/campus-schema"
import type { CatalogItem } from "../../api/types/catalog"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "campuses-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchCampusesProps {
  filters: CampusFiltersFormInput
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  zones: CatalogItem[]
}

export function SearchCampuses({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  zones,
}: SearchCampusesProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.search)
  const [draftZone, setDraftZone] = useState(filters.zones[0] ?? "")

  // El filtro avanzado (zona) se cuenta aparte del buscador para el badge.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ filters, applyFilters })
  latest.current = { filters, applyFilters }

  // Sincroniza cambios externos (p. ej. "Limpiar todo") hacia el input.
  useEffect(() => {
    setSearch(filters.search)
  }, [filters.search])

  // Aplica el buscador con retardo, preservando los filtros avanzados.
  useEffect(() => {
    if (search === latest.current.filters.search) return
    const timeout = setTimeout(() => {
      const { filters, applyFilters } = latest.current
      applyFilters({ ...filters, search })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) setDraftZone(filters.zones[0] ?? "")
  }, [open, filters.zones])

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search,
      zones: draftZone ? [draftZone] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  function removeFilter(field: "zones") {
    applyFilters({ ...filters, [field]: [] })
  }

  const zoneItems = [
    { value: "", label: "Todas" },
    ...zones.map((zone) => ({ value: zone.code, label: zone.name })),
  ]

  // La X de la barra limpia todo —texto y filtros—, así que solo aparece
  // cuando hay algo que limpiar.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  const activeChips: { key: "zones"; label: string }[] = []
  if (filters.zones[0]) {
    activeChips.push({
      key: "zones",
      label: `Zona: ${zones.find((z) => z.code === filters.zones[0])?.name ?? filters.zones[0]}`,
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
          placeholder="Buscar por sede o código DANE"
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
            onApply={handleApplyAdvanced}
          >
            <FieldSet className="px-4">
              <FieldLegend variant="label">Ubicación</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="campus-zone">Zona</FieldLabel>
                  <Select
                    items={zoneItems}
                    value={draftZone}
                    onValueChange={(value) => setDraftZone(value ?? "")}
                  >
                    <SelectTrigger id="campus-zone" size="sm" className="w-full">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      {zoneItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldSet>
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
