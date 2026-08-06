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

import type { EmployeeFiltersFormInput } from "../../api/employee-schema"
import type { CatalogItem } from "../../api/types/catalog"
import type { EmployeeStatus } from "../../api/types/employee"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "employees-search"

// Retardo del buscador para no navegar en cada tecla.
const SEARCH_DEBOUNCE_MS = 350

interface SearchEmployeesProps {
  filters: EmployeeFiltersFormInput
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  roles: CatalogItem[]
  workSchedules: CatalogItem[]
  statuses: CatalogItem[]
}

export function SearchEmployees({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  roles,
  workSchedules,
  statuses,
}: SearchEmployeesProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(filters.search)
  const [draftRole, setDraftRole] = useState(filters.roles[0] ?? "")
  const [draftSchedule, setDraftSchedule] = useState(filters.workSchedules[0] ?? "")
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")

  // Los filtros avanzados (rol, jornada, estado) se cuentan aparte del
  // buscador para el badge del botón.
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
    if (open) {
      setDraftRole(filters.roles[0] ?? "")
      setDraftSchedule(filters.workSchedules[0] ?? "")
      setDraftStatus(filters.statuses[0] ?? "")
    }
  }, [open, filters.roles, filters.workSchedules, filters.statuses])

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search,
      roles: draftRole ? [draftRole] : [],
      workSchedules: draftSchedule ? [draftSchedule] : [],
      statuses: draftStatus ? [draftStatus as EmployeeStatus] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  // Quita un único filtro avanzado, preservando el resto y el buscador.
  function removeFilter(field: "roles" | "workSchedules" | "statuses") {
    applyFilters({ ...filters, [field]: [] })
  }

  const roleItems = [
    { value: "", label: "Todos" },
    ...roles.map((role) => ({ value: role.code, label: role.name })),
  ]
  const scheduleItems = [
    { value: "", label: "Todas" },
    ...workSchedules.map((schedule) => ({ value: schedule.code, label: schedule.name })),
  ]
  const statusItems = [
    { value: "", label: "Todos" },
    ...statuses.map((status) => ({ value: status.id, label: status.name })),
  ]

  // La X de la barra limpia todo —texto y filtros—, así que solo aparece
  // cuando hay algo que limpiar.
  const hasAnythingToClear = activeFilterCount > 0 || search !== ""

  // Chips de los filtros avanzados activos, para que el usuario vea qué
  // aplicó sin abrir el popover.
  const activeChips: { key: "roles" | "workSchedules" | "statuses"; label: string }[] = []
  if (filters.roles[0]) {
    activeChips.push({
      key: "roles",
      label: `Rol: ${roles.find((r) => r.code === filters.roles[0])?.name ?? filters.roles[0]}`,
    })
  }
  if (filters.workSchedules[0]) {
    activeChips.push({
      key: "workSchedules",
      label: `Jornada: ${
        workSchedules.find((s) => s.code === filters.workSchedules[0])?.name ??
        filters.workSchedules[0]
      }`,
    })
  }
  if (filters.statuses[0]) {
    activeChips.push({
      key: "statuses",
      label: `Estado: ${
        statuses.find((s) => s.id === filters.statuses[0])?.name ?? filters.statuses[0]
      }`,
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
          placeholder="Buscar por documento, nombre o sede"
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
            {/* Los tres son atributos del funcionario: van en una rejilla bajo
                un mismo título, no separados por líneas. */}
            <FieldSet className="px-4">
              <FieldLegend variant="label">Clasificación</FieldLegend>
              <div className="grid grid-cols-3 gap-3">
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-role">Rol</FieldLabel>
                  <Select
                    items={roleItems}
                    value={draftRole}
                    onValueChange={(value) => setDraftRole(value ?? "")}
                  >
                    <SelectTrigger id="employee-role" size="sm" className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-schedule">Jornada</FieldLabel>
                  <Select
                    items={scheduleItems}
                    value={draftSchedule}
                    onValueChange={(value) => setDraftSchedule(value ?? "")}
                  >
                    <SelectTrigger id="employee-schedule" size="sm" className="w-full">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-status">Estado</FieldLabel>
                  <Select
                    items={statusItems}
                    value={draftStatus}
                    onValueChange={(value) => setDraftStatus(value ?? "")}
                  >
                    <SelectTrigger id="employee-status" size="sm" className="w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusItems.map((item) => (
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
