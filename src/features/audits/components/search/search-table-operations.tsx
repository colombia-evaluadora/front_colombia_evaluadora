import { useEffect, useRef, useState } from "react"
import { CheckIcon, FunnelIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
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

import {
  FIELD_FILTER_CONDITION_LABELS,
  type FieldFilter,
  type TableOperationsFiltersFormInput,
  type TableOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"
import { useAuditOperationTypesQuery } from "../../api/query/use-audit-operation-types-query"
import { FilterTableOperationsForm } from "../forms/form-filter-table-operations"

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
  const [search, setSearch] = useState(filters.author)

  const { data: operationOptions = [] } = useAuditOperationTypesQuery()

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

  function handleApplyAdvanced(values: TableOperationsFiltersFormValues) {
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
  function removeOperation(operation: OperationType) {
    applyFilters({
      ...filters,
      operations: filters.operations.filter((o) => o !== operation),
    })
  }

  function removeFieldFilter(index: number) {
    applyFilters({
      ...filters,
      fieldFilters: filters.fieldFilters.filter((_, i) => i !== index),
    })
  }

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover. El autor vive en el buscador, no acá.
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
  filters.fieldFilters.forEach((fieldFilter: FieldFilter, index: number) => {
    activeChips.push({
      key: `field-filter-${index}`,
      label: `${fieldFilter.field} ${FIELD_FILTER_CONDITION_LABELS[fieldFilter.condition]} "${fieldFilter.value}"`,
      onRemove: () => removeFieldFilter(index),
    })
  })

  // Hay algo que limpiar si el usuario escribió en el buscador o si quedó
  // algún filtro avanzado puesto.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {/*
        El `Field` outlined solo aporta la etiqueta flotante: el borde y el
        foco los sigue pintando el propio `InputGroup`. Sin `aria-label` en el
        control, para que el nombre accesible lo dé la etiqueta visible.

        Los chips de los filtros activos viven *dentro* del campo, en un
        renglón propio bajo el input: el buscador y los filtros son una sola
        cosa para el usuario, y listarlos fuera separaba visualmente la causa
        (el embudo) del efecto. De ahí el `h-auto min-h-9 flex-wrap`: el campo
        crece hacia abajo en vez de comprimir el input.
      */}
      <Field orientation="vertical" variant="outlined" className="w-full max-w-xl">
        <FieldLabel htmlFor={SEARCH_INPUT_ID}>Buscar</FieldLabel>
        <InputGroup className="h-auto min-h-9 w-full flex-wrap rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
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

            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger
                render={
                  <InputGroupButton
                    size="icon-xs"
                    // Con filtros puestos el embudo se rellena (`fill muted`)
                    // para que se lea como un estado activo, no como una
                    // acción más de la barra.
                    variant={activeFilterCount > 0 ? "fill" : "ghost"}
                    color="muted"
                    aria-label="Filtros avanzados"
                    aria-pressed={activeFilterCount > 0}
                    className="relative"
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

              {/*
                Más ancho que un popover normal para que cada sección reparta
                sus controles en columnas, pero no tanto como para que el
                recorrido se vuelva horizontal: las secciones se apilan en el
                orden en que se usan (operación → fechas → filtros por campo).
                El ancho se topa contra el viewport para que siga cabiendo en
                pantallas chicas.
              */}
              <PopoverContent align="end" className="w-[min(42rem,calc(100vw-2rem))] gap-3 p-0">
                <PopoverHeader className="border-b p-4">
                  <PopoverTitle>Filtros avanzados</PopoverTitle>
                </PopoverHeader>

                <div className="max-h-[60dvh] overflow-y-auto py-4">
                  <FilterTableOperationsForm
                    id={FILTER_TABLE_OPERATIONS_FORM_ID}
                    defaultValues={filters}
                    onSubmit={handleApplyAdvanced}
                    availableFields={availableFields}
                    hideAuthor
                  />
                </div>

                {/*
                  Ya no hay "Limpiar todo" acá: esa acción es la X de la barra,
                  que está siempre a la vista y no obliga a abrir el popover.
                */}
                <div className="flex justify-end border-t p-4">
                  <Button
                    type="submit"
                    form={FILTER_TABLE_OPERATIONS_FORM_ID}
                    color="primary"
                    size="sm"
                    className="min-w-40 rounded-full"
                  >
                    <CheckIcon data-icon="inline-start" />
                    Aplicar filtros
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </InputGroupAddon>

          {/*
            Los chips ocupan su propia línea, debajo: `w-full` los saca del
            renglón por el `flex-wrap` del grupo y `order-last` los manda al
            final. Así el input siempre queda arriba, pegado a la lupa y con su
            ancho completo, en vez de irse achicando a medida que se agregan
            filtros. Va con `align="inline-end"` a propósito: `block-end`
            volvería columna a todo el InputGroup y apilaría también la lupa y
            los botones.
          */}
          {activeChips.length > 0 && (
            <InputGroupAddon
              align="inline-end"
              className="order-last w-full flex-wrap justify-start gap-1 px-2 pt-0 pb-2"
            >
              {activeChips.map((chip) => (
                // `normal-case tracking-normal`: el Badge del design system es
                // versalita para etiquetas de estado; acá el contenido es texto
                // del usuario ("Operación: Actualización") y en mayúsculas se
                // vuelve ilegible.
                <Badge
                  key={chip.key}
                  variant="fill"
                  color="muted"
                  className="max-w-full gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium tracking-normal normal-case"
                >
                  <span className="truncate">{chip.label}</span>
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-foreground/10 hover:text-foreground"
                    onClick={chip.onRemove}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </InputGroupAddon>
          )}
        </InputGroup>
      </Field>
    </div>
  )
}
