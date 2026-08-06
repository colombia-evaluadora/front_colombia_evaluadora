import { useState } from "react"
import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { AdvancedFiltersPopover } from "@/components/search/advanced-filters-popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { EMPLOYEE_STATUS_LABELS } from "@/features/establishment/api/employee-ui-mappings"
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from "@/features/establishment/api/types/employee"

// Valor vacío del select = sin filtro de estado ("Todos").
const ALL_VALUE = ""

interface SearchAcademicAssignmentsProps {
  search: string
  onSearchChange: (value: string) => void
  status: EmployeeStatus | ""
  onStatusChange: (value: EmployeeStatus | "") => void
}

export function SearchAcademicAssignments({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: SearchAcademicAssignmentsProps) {
  const [open, setOpen] = useState(false)

  const hasStatus = status !== ""

  // La X de la barra limpia todo —texto y filtros—, así que solo aparece
  // cuando hay algo que limpiar.
  const hasAnythingToClear = hasStatus || search !== ""

  function handleClearAll() {
    onSearchChange("")
    onStatusChange("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <InputGroup className="h-9 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 sm:w-96">
        <InputGroupAddon align="inline-start" className="ml-2">
          <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
        </InputGroupAddon>

        <InputGroupInput
          id="academic-assignments-search"
          type="search"
          autoComplete="off"
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
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

          {/*
            Acá los filtros se aplican al vuelo (no hay borrador), así que
            "Aplicar filtros" solo cierra el panel — mantiene el mismo gesto de
            salida que en el resto de los buscadores.
          */}
          <AdvancedFiltersPopover
            open={open}
            onOpenChange={setOpen}
            activeFilterCount={hasStatus ? 1 : 0}
            badgeCount={hasStatus ? 1 : 0}
            onApply={() => setOpen(false)}
          >
            <FieldSet className="px-4">
              <FieldLegend variant="label">Estado</FieldLegend>
              <div className="grid grid-cols-2 gap-3">
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="academic-assignments-status">Estado</FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      onStatusChange((value as EmployeeStatus | null) ?? "")
                    }
                  >
                    <SelectTrigger id="academic-assignments-status" size="sm" className="w-full">
                      <SelectValue placeholder="Todos">
                        {(value) =>
                          EMPLOYEE_STATUS_LABELS[value as EmployeeStatus] ?? "Todos"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                        {EMPLOYEE_STATUSES.map((value) => (
                          <SelectItem key={value} value={value}>
                            {EMPLOYEE_STATUS_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </FieldSet>
          </AdvancedFiltersPopover>
        </InputGroupAddon>
      </InputGroup>

      {hasStatus && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 py-0.5 pr-1 pl-2.5 text-xs font-medium text-secondary-foreground">
            {`Estado: ${EMPLOYEE_STATUS_LABELS[status]}`}
            <button
              type="button"
              aria-label="Quitar filtro de estado"
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              onClick={() => onStatusChange("")}
            >
              <XIcon className="size-3" />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
