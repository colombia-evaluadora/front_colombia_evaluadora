import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
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

// Los filtros de este tab no viven en la URL sino en el estado del padre, pero
// se escriben en el input igual que en el resto de los listados.
// Ver `@/components/search/query-syntax`.
interface AssignmentFilters {
  search: string
  status: EmployeeStatus | ""
}

const SYNTAX: QuerySyntax<AssignmentFilters> = {
  empty: { search: "", status: "" },
  freeText: { key: "nombre", field: "search" },
  terms: [
    optionTerm(
      "estado",
      "status",
      EMPLOYEE_STATUSES.map((status) => ({ value: status, label: EMPLOYEE_STATUS_LABELS[status] })),
    ),
  ],
}

interface SearchAcademicAssignmentsProps {
  search: string
  onSearchChange: (value: string) => void
  status: EmployeeStatus | ""
  onStatusChange: (value: EmployeeStatus | "") => void
}

export function SearchAcademicAssignments({
  search: searchFilter,
  onSearchChange,
  status,
  onStatusChange,
}: SearchAcademicAssignmentsProps) {
  const [open, setOpen] = useState(false)

  const filters = useMemo<AssignmentFilters>(
    () => ({ search: searchFilter, status }),
    [searchFilter, status],
  )

  const { search, setSearch } = useQuerySearch({
    syntax: SYNTAX,
    filters,
    applyFilters: (next) => {
      onSearchChange(next.search)
      onStatusChange(next.status)
    },
  })

  const hasStatus = status !== ""

  function handleClearAll() {
    onSearchChange("")
    onStatusChange("")
    setSearch("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SearchQueryBar
        id="academic-assignments-search"
        label={null}
        placeholder="Buscar por nombre"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={hasStatus ? 1 : 0}
        badgeCount={hasStatus ? 1 : 0}
        open={open}
        onOpenChange={setOpen}
        // Acá los filtros se aplican al vuelo (no hay borrador), así que
        // "Aplicar filtros" solo cierra el panel — mantiene el mismo gesto de
        // salida que en el resto de los buscadores.
        onApply={() => setOpen(false)}
        size="sm"
      >
        {/* Un solo control: sin `FieldSet`, porque el título de la sección
            repetiría la etiqueta del campo. */}
        <div className="px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="academic-assignments-status">Estado</FieldLabel>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange((value as EmployeeStatus | null) ?? "")}
            >
              <SelectTrigger id="academic-assignments-status" size="sm" className="w-full">
                <SelectValue placeholder="Todos">
                  {(value) => EMPLOYEE_STATUS_LABELS[value as EmployeeStatus] ?? "Todos"}
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
      </SearchQueryBar>
    </div>
  )
}
