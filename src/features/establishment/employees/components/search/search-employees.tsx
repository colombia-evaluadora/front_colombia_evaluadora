import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, optionsTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import type { EmployeeFiltersFormInput } from "@/features/establishment/employees/api/schema"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { EstadoFuncionario } from "@/features/establishment/employees/api/types/funcionario"
import { toSearchOptions, toSelectItemsMap } from "@/lib/catalog-options"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "employees-search"

interface SearchEmployeesProps {
  filters: EmployeeFiltersFormInput
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  roles: CatalogItem[]
  workSchedules: CatalogItem[]
  /** Sedes del establecimiento elegido que el usuario alcanza. */
  campuses: { id: number; name: string }[]
  statuses: { code: EstadoFuncionario; name: string }[]
}

interface SelectFilterProps {
  id: string
  label: string
  items: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

function SelectFilter({ id, label, items, value, onChange }: SelectFilterProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField items={toSelectItemsMap(items)} value={value} onValueChange={(next) => onChange(next ?? "")}>
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder={items[0]?.label} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

/** Busca por nombre y número de documento; el panel filtra por Sede, Jornada, Rol y Estado. */
export function SearchEmployees({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  roles,
  workSchedules,
  campuses,
  statuses,
}: SearchEmployeesProps) {
  const [open, setOpen] = useState(false)
  const [draftCampus, setDraftCampus] = useState(filters.campusId)
  const [draftRole, setDraftRole] = useState(filters.roles[0] ?? "")
  const [draftSchedule, setDraftSchedule] = useState(filters.workSchedules[0] ?? "")
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")

  const campusOptions = campuses.map((campus) => ({ value: String(campus.id), label: campus.name }))
  const statusOptions = statuses.map((status) => ({ value: status.code, label: status.name }))

  // Los filtros se escriben dentro del input —`rol:(Docente)`— igual que en
  // el resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax: QuerySyntax<EmployeeFiltersFormInput> = {
    empty: { search: "", roles: [], workSchedules: [], statuses: [], campusId: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("sede", "campusId", campusOptions),
      optionsTerm("jornada", "workSchedules", toSearchOptions(workSchedules)),
      optionsTerm("rol", "roles", toSearchOptions(roles)),
      optionsTerm("estado", "statuses", statusOptions),
    ],
  }

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Los filtros avanzados se cuentan aparte del buscador para el badge del botón.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) {
      setDraftCampus(filters.campusId)
      setDraftRole(filters.roles[0] ?? "")
      setDraftSchedule(filters.workSchedules[0] ?? "")
      setDraftStatus(filters.statuses[0] ?? "")
    }
  }, [open, filters.campusId, filters.roles, filters.workSchedules, filters.statuses])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se reescribe.
    applyFilters({
      ...filters,
      search: freeText,
      campusId: draftCampus,
      roles: draftRole ? [draftRole] : [],
      workSchedules: draftSchedule ? [draftSchedule] : [],
      statuses: draftStatus ? [draftStatus as EstadoFuncionario] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por nombre o número de documento"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        onApply={handleApplyAdvanced}
      >
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            <SelectFilter
              id="employee-campus"
              label="Sede"
              items={[{ value: "", label: "Todas" }, ...campusOptions]}
              value={draftCampus}
              onChange={setDraftCampus}
            />
            <SelectFilter
              id="employee-schedule"
              label="Jornada"
              items={[{ value: "", label: "Todas" }, ...toSearchOptions(workSchedules)]}
              value={draftSchedule}
              onChange={setDraftSchedule}
            />
            <SelectFilter
              id="employee-role"
              label="Rol"
              items={[{ value: "", label: "Todos" }, ...toSearchOptions(roles)]}
              value={draftRole}
              onChange={setDraftRole}
            />
            <SelectFilter
              id="employee-status"
              label="Estado"
              items={[{ value: "", label: "Todos" }, ...statusOptions]}
              value={draftStatus}
              onChange={setDraftStatus}
            />
          </div>
        </div>
      </SearchQueryBar>
    </div>
  )
}
