import { useEffect, useRef, useState } from "react"
import { CheckIcon, FunnelIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

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
              <PopoverContent align="end" className="w-[min(42rem,calc(100vw-2rem))] gap-0 p-0">
                {/*
                  Sin `border-b`: el panel se lee como un bloque continuo y la
                  jerarquía la marca el tamaño del título, no una línea. El
                  `PopoverTitle` del design system es versalita —pensado para
                  popovers chicos—, y acá encabeza un panel entero.
                */}
                <PopoverHeader className="px-4 pt-4">
                  <PopoverTitle className="text-xl font-semibold normal-case">
                    Filtros avanzados
                  </PopoverTitle>
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
                <div className="flex justify-end px-4 pb-4">
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
        </InputGroup>
      </Field>
    </div>
  )
}
