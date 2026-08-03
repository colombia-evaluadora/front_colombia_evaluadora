import { useState } from "react"
import {
  FunnelIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"

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
          {search && (
            <InputGroupButton
              size="icon-xs"
              aria-label="Limpiar búsqueda"
              className="text-muted-foreground hover:text-primary"
              onClick={() => onSearchChange("")}
            >
              <XIcon />
            </InputGroupButton>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <InputGroupButton
                  size="icon-xs"
                  variant={hasStatus ? "soft" : "ghost"}
                  color={hasStatus ? "secondary" : undefined}
                  aria-label="Filtros"
                  aria-pressed={hasStatus}
                  className="relative text-muted-foreground hover:text-primary aria-pressed:text-secondary-foreground"
                />
              }
            >
              <FunnelIcon />
              {hasStatus && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
              )}
            </PopoverTrigger>

            <PopoverContent align="end" className="w-72 gap-3 p-0">
              <PopoverHeader className="border-b p-4">
                <PopoverTitle>Filtros</PopoverTitle>
              </PopoverHeader>

              <div className="p-4">
                <Field orientation="vertical" variant="outlined" className="gap-2">
                  <FieldLabel htmlFor="academic-assignments-status">
                    Estado
                  </FieldLabel>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      onStatusChange((value as EmployeeStatus | null) ?? "")
                    }
                  >
                    <SelectTrigger id="academic-assignments-status" size="sm">
                      <SelectValue placeholder="Todos">
                        {(value) =>
                          EMPLOYEE_STATUS_LABELS[value as EmployeeStatus] ??
                          "Todos"
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
            </PopoverContent>
          </Popover>
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
