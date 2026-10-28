import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, type QueryOption, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import type { AcademicAssignmentFilters } from "@/features/establishment/academic-period/api/types/academic-assignment"

// Valor vacío de los selects = sin filtro ("Todos").
const ALL_VALUE = ""

export const EMPTY_ASSIGNMENT_FILTERS: AcademicAssignmentFilters = {
  search: "",
  funcionarioId: "",
  gradeId: "",
  subjectId: "",
  status: "",
}

const STATUS_OPTIONS: QueryOption[] = [
  { value: "A", label: "Activa" },
  { value: "I", label: "Inactiva" },
]

interface SearchAcademicAssignmentsProps {
  filters: AcademicAssignmentFilters
  onFiltersChange: (filters: AcademicAssignmentFilters) => void
  teachers: QueryOption[]
  grades: QueryOption[]
  subjects: QueryOption[]
}

// Busca por Docente o Asignatura y filtra por Docente, Grado, Asignatura y
// Estado (Sección 5.4). Los filtros viven en el estado del tab, no en la URL.
export function SearchAcademicAssignments({
  filters,
  onFiltersChange,
  teachers,
  grades,
  subjects,
}: SearchAcademicAssignmentsProps) {
  const [open, setOpen] = useState(false)

  // Los ids numéricos viajan como texto en la sintaxis del buscador.
  const asText = {
    ...filters,
    gradeId: String(filters.gradeId),
    subjectId: String(filters.subjectId),
  }
  type TextFilters = typeof asText
  const syntax: QuerySyntax<TextFilters> = {
    empty: { ...EMPTY_ASSIGNMENT_FILTERS, gradeId: "", subjectId: "" },
    freeText: { key: "texto", field: "search" },
    terms: [
      optionTerm("docente", "funcionarioId", teachers),
      optionTerm("grado", "gradeId", grades),
      optionTerm("asignatura", "subjectId", subjects),
      optionTerm("estado", "status", STATUS_OPTIONS),
    ],
  }

  const fromText = (next: TextFilters): AcademicAssignmentFilters => ({
    search: next.search,
    funcionarioId: next.funcionarioId,
    gradeId: next.gradeId ? Number(next.gradeId) : "",
    subjectId: next.subjectId ? Number(next.subjectId) : "",
    status: next.status as AcademicAssignmentFilters["status"],
  })

  const { search, setSearch } = useQuerySearch({
    syntax,
    filters: asText,
    applyFilters: (next) => onFiltersChange(fromText(next)),
  })

  const activeCount = [
    filters.funcionarioId,
    filters.gradeId,
    filters.subjectId,
    filters.status,
  ].filter((v) => v !== "").length

  function setFilter<K extends keyof TextFilters>(key: K, value: string) {
    onFiltersChange(fromText({ ...asText, [key]: value }))
  }

  function handleClearAll() {
    onFiltersChange(EMPTY_ASSIGNMENT_FILTERS)
    setSearch("")
    setOpen(false)
  }

  const selects: { key: keyof TextFilters; label: string; options: QueryOption[] }[] = [
    { key: "funcionarioId", label: "Docente", options: teachers },
    { key: "gradeId", label: "Grado", options: grades },
    { key: "subjectId", label: "Asignatura", options: subjects },
    { key: "status", label: "Estado", options: STATUS_OPTIONS },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SearchQueryBar
        id="academic-assignments-search"
        label="Buscar"
        placeholder="Buscar por docente o asignatura"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeCount}
        badgeCount={activeCount}
        open={open}
        onOpenChange={setOpen}
        // Los filtros se aplican al vuelo: "Aplicar filtros" solo cierra el panel.
        onApply={() => setOpen(false)}
        size="sm"
        className="sm:w-[28rem]"
      >
        <div className="flex flex-col gap-4 px-4">
          {selects.map(({ key, label, options }) => {
            const id = `academic-assignments-${key}`
            return (
              <Field key={key} orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <ComboboxField
                  value={asText[key]}
                  onValueChange={(value) => setFilter(key, (value as string | null) ?? ALL_VALUE)}
                >
                  <ComboboxFieldTrigger id={id} size="sm" className="w-full">
                    <ComboboxFieldValue placeholder="Todos">
                      {(value) => options.find((o) => o.value === value)?.label ?? "Todos"}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxGroup>
                      <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                      {options.map((option) => (
                        <ComboboxFieldItem key={option.value} value={option.value}>
                          {option.label}
                        </ComboboxFieldItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            )
          })}
        </div>
      </SearchQueryBar>
    </div>
  )
}
