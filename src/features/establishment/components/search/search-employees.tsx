import { useEffect, useRef, useState } from "react"

import { EraserIcon, FunnelIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import type { EmployeeFiltersFormInput } from "../../api/employee-schema"
import type { CatalogItem } from "../../api/types/catalog"
import type { EmployeeStatus } from "../../api/types/employee"

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
      <InputGroup className="h-9 w-full max-w-xl rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
        <InputGroupAddon align="inline-start" className="ml-2">
          <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
        </InputGroupAddon>

        <InputGroupInput
          type="search"
          autoComplete="off"
          placeholder="Buscar por documento, nombre o sede"
          aria-label="Buscar funcionarios"
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

              <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto px-4 py-4">
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-role">Rol</FieldLabel>
                  <Select
                    items={roleItems}
                    value={draftRole}
                    onValueChange={(value) => setDraftRole(value ?? "")}
                  >
                    <SelectTrigger id="employee-role" size="sm">
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

                <Separator />

                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-schedule">Jornada</FieldLabel>
                  <Select
                    items={scheduleItems}
                    value={draftSchedule}
                    onValueChange={(value) => setDraftSchedule(value ?? "")}
                  >
                    <SelectTrigger id="employee-schedule" size="sm">
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

                <Separator />

                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="employee-status">Estado</FieldLabel>
                  <Select
                    items={statusItems}
                    value={draftStatus}
                    onValueChange={(value) => setDraftStatus(value ?? "")}
                  >
                    <SelectTrigger id="employee-status" size="sm">
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

              <div className="flex items-center justify-between gap-2 border-t p-4">
                <Button
                  type="button"
                  color="muted"
                  size="sm"
                  onClick={handleClearAll}
                >
                  <EraserIcon data-icon="inline-start" />
                  Limpiar todo
                </Button>
                <Button type="button" color="primary" size="sm" onClick={handleApplyAdvanced}>
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
