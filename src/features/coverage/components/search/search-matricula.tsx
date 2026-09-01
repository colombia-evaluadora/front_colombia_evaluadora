import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionsTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import { MATRICULA_STATUSES, type MatriculaFiltersFormInput } from "@/features/coverage/api/schema"
import { MATRICULA_STATUS_LABELS } from "@/features/coverage/api/ui-mappings-matricula"
import { useMatriculaCampusesQuery } from "@/features/coverage/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import { toSelectItemsMap } from "@/lib/catalog-options"

const SEARCH_INPUT_ID = "matricula-search"

const STATUS_OPTIONS = MATRICULA_STATUSES.map((status) => ({
  value: status,
  label: MATRICULA_STATUS_LABELS[status],
}))

interface SearchMatriculaProps {
  filters: MatriculaFiltersFormInput
  applyFilters: (values: MatriculaFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function SearchMatricula({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchMatriculaProps) {
  const [open, setOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")
  // Sede → Jornada → Grado → Grupo — misma cascada que "Modificar" (ver
  // `dialog-modificar-matricula.tsx` y `use-matricula-dependent-catalogs-query.ts`).
  const [draftCampus, setDraftCampus] = useState(filters.campus)
  const [draftShift, setDraftShift] = useState(filters.shift)
  const [draftGrade, setDraftGrade] = useState(filters.grade)
  const [draftGroup, setDraftGroup] = useState(filters.group)

  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: dependentCatalogs } = useMatriculaDependentCatalogsQuery({
    campus: draftCampus || undefined,
    shift: draftShift || undefined,
    grade: draftGrade ? Number(draftGrade) : undefined,
  })

  // Igual que en establecimientos: el estado se escribe dentro del input,
  // `estado:(Activo)`. Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<MatriculaFiltersFormInput>>(
    () => ({
      empty: { search: "", statuses: [], campus: "", shift: "", grade: "", group: "" },
      freeText: { key: "texto", field: "search" },
      terms: [optionsTerm("estado", "statuses", STATUS_OPTIONS)],
    }),
    [],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setDraftStatus(filters.statuses[0] ?? "")
    setDraftCampus(filters.campus)
    setDraftShift(filters.shift)
    setDraftGrade(filters.grade)
    setDraftGroup(filters.group)
  }, [open, filters.statuses, filters.campus, filters.shift, filters.grade, filters.group])

  // Misma cascada que "Modificar": cambiar un prerequisito limpia los
  // campos que dependen de él, para no dejar seleccionada una combinación
  // que ya no aplica.
  function handleDraftCampusChange(value: string) {
    setDraftCampus(value)
    setDraftShift("")
    setDraftGrade("")
    setDraftGroup("")
  }

  function handleDraftShiftChange(value: string) {
    setDraftShift(value as MatriculaFiltersFormInput["shift"])
    setDraftGrade("")
    setDraftGroup("")
  }

  function handleDraftGradeChange(value: string) {
    setDraftGrade(value)
    setDraftGroup("")
  }

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search: freeText,
      statuses: draftStatus ? [draftStatus as MatriculaFiltersFormInput["statuses"][number]] : [],
      campus: draftCampus,
      shift: draftShift,
      grade: draftGrade,
      group: draftGroup,
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const statusItems = [{ value: "", label: "Todos" }, ...STATUS_OPTIONS]
  const campusItems = [{ value: "", label: "Todas" }, ...(catalogs?.campuses ?? []).map((c) => ({ value: c, label: c }))]
  const shiftItems = [
    { value: "", label: "Todas" },
    ...(dependentCatalogs?.shifts ?? []).map((s) => ({ value: s, label: s })),
  ]
  const gradeItems = [
    { value: "", label: "Todos" },
    ...(dependentCatalogs?.grades ?? []).map((g) => ({ value: String(g.valor), label: g.nombre })),
  ]
  const groupItems = [
    { value: "", label: "Todos" },
    ...(dependentCatalogs?.groups ?? []).map((g) => ({ value: g.codigo, label: g.codigo })),
  ]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        onApply={handleApplyAdvanced}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-3 px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-campus">Sede</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(campusItems)}
              value={draftCampus}
              onValueChange={(value) => handleDraftCampusChange(value ?? "")}
            >
              <ComboboxFieldTrigger id="matricula-campus" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todas" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {campusItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-shift">Jornada</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(shiftItems)}
              value={draftShift}
              onValueChange={(value) => handleDraftShiftChange(value ?? "")}
              disabled={!draftCampus}
            >
              <ComboboxFieldTrigger id="matricula-shift" size="sm" className="w-full">
                <ComboboxFieldValue placeholder={!draftCampus ? "Elegí sede primero" : "Todas"} />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {shiftItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-grade">Grado</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(gradeItems)}
              value={draftGrade}
              onValueChange={(value) => handleDraftGradeChange(value ?? "")}
              disabled={!draftShift}
            >
              <ComboboxFieldTrigger id="matricula-grade" size="sm" className="w-full">
                <ComboboxFieldValue placeholder={!draftShift ? "Elegí jornada primero" : "Todos"} />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {gradeItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-group">Grupo</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(groupItems)}
              value={draftGroup}
              onValueChange={(value) => setDraftGroup(value ?? "")}
              disabled={!draftGrade}
            >
              <ComboboxFieldTrigger id="matricula-group" size="sm" className="w-full">
                <ComboboxFieldValue placeholder={!draftGrade ? "Elegí grado primero" : "Todos"} />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {groupItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-status">Estado</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(statusItems)}
              value={draftStatus}
              onValueChange={(value) => setDraftStatus(value ?? "")}
            >
              <ComboboxFieldTrigger id="matricula-status" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {statusItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>
      </SearchQueryBar>
    </div>
  )
}
