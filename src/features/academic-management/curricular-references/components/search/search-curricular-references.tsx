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

import type { CurricularReferenceFiltersFormInput } from "@/features/academic-management/curricular-references/api/schema"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

const SEARCH_INPUT_ID = "curricular-references-search"

interface SearchCurricularReferencesProps {
  filters: CurricularReferenceFiltersFormInput
  applyFilters: (values: CurricularReferenceFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  educationLevels: CatalogItem[]
  pedagogicalApproaches: CatalogItem[]
  evaluationTypes: CatalogItem[]
}

function toOptions(items: CatalogItem[]) {
  return items.map((item) => ({ value: String(item.id), label: item.name }))
}

export function SearchCurricularReferences({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  educationLevels,
  pedagogicalApproaches,
  evaluationTypes,
}: SearchCurricularReferencesProps) {
  const [open, setOpen] = useState(false)
  const [draftEducationLevel, setDraftEducationLevel] = useState(filters.educationLevels[0] ?? "")
  const [draftPedagogicalApproach, setDraftPedagogicalApproach] = useState(
    filters.pedagogicalApproaches[0] ?? "",
  )
  const [draftEvaluationType, setDraftEvaluationType] = useState(filters.evaluationTypes[0] ?? "")
  const [draftActive, setDraftActive] = useState(filters.active)

  const educationLevelOptions = useMemo(() => toOptions(educationLevels), [educationLevels])
  const pedagogicalApproachOptions = useMemo(() => toOptions(pedagogicalApproaches), [pedagogicalApproaches])
  const evaluationTypeOptions = useMemo(() => toOptions(evaluationTypes), [evaluationTypes])

  const syntax = useMemo<QuerySyntax<CurricularReferenceFiltersFormInput>>(
    () => ({
      empty: { search: "", educationLevels: [], pedagogicalApproaches: [], evaluationTypes: [], active: "" },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("nivel", "educationLevels", educationLevelOptions),
        optionsTerm("enfoque", "pedagogicalApproaches", pedagogicalApproachOptions),
        optionsTerm("evaluacion", "evaluationTypes", evaluationTypeOptions),
      ],
    }),
    [educationLevelOptions, pedagogicalApproachOptions, evaluationTypeOptions],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setDraftEducationLevel(filters.educationLevels[0] ?? "")
    setDraftPedagogicalApproach(filters.pedagogicalApproaches[0] ?? "")
    setDraftEvaluationType(filters.evaluationTypes[0] ?? "")
    setDraftActive(filters.active)
  }, [open, filters.educationLevels, filters.pedagogicalApproaches, filters.evaluationTypes, filters.active])

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search: freeText,
      educationLevels: draftEducationLevel ? [draftEducationLevel] : [],
      pedagogicalApproaches: draftPedagogicalApproach ? [draftPedagogicalApproach] : [],
      evaluationTypes: draftEvaluationType ? [draftEvaluationType] : [],
      active: draftActive,
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const educationLevelItems = [{ value: "", label: "Todos" }, ...educationLevelOptions]
  const pedagogicalApproachItems = [{ value: "", label: "Todos" }, ...pedagogicalApproachOptions]
  const evaluationTypeItems = [{ value: "", label: "Todos" }, ...evaluationTypeOptions]
  const activeItems = [
    { value: "", label: "Todos" },
    { value: "true", label: "Activo" },
    { value: "false", label: "Inactivo" },
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
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="curricular-reference-education-level">Nivel educativo</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(educationLevelItems.map((item) => [item.value, item.label]))}
              value={draftEducationLevel}
              onValueChange={(value) => setDraftEducationLevel(value ?? "")}
            >
              <ComboboxFieldTrigger id="curricular-reference-education-level" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {educationLevelItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="curricular-reference-evaluation-type">Tipo de evaluación</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(evaluationTypeItems.map((item) => [item.value, item.label]))}
              value={draftEvaluationType}
              onValueChange={(value) => setDraftEvaluationType(value ?? "")}
            >
              <ComboboxFieldTrigger id="curricular-reference-evaluation-type" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {evaluationTypeItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="curricular-reference-pedagogical-approach">Enfoque pedagógico</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(pedagogicalApproachItems.map((item) => [item.value, item.label]))}
              value={draftPedagogicalApproach}
              onValueChange={(value) => setDraftPedagogicalApproach(value ?? "")}
            >
              <ComboboxFieldTrigger
                id="curricular-reference-pedagogical-approach"
                size="sm"
                className="w-full"
              >
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {pedagogicalApproachItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="curricular-reference-active">Estado</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(activeItems.map((item) => [item.value, item.label]))}
              value={draftActive}
              onValueChange={(value) => setDraftActive(value ?? "")}
            >
              <ComboboxFieldTrigger id="curricular-reference-active" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {activeItems.map((item) => (
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
