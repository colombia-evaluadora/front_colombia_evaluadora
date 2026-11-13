import { useEffect, useState } from "react"

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

import type { MatriculaFiltersFormInput } from "@/features/coverage/shared/api/schema"
import { useMatriculaCampusesQuery } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { useMatriculaPeriodosAbiertosQuery } from "@/features/coverage/matricula/api/query/use-matricula-periodos-abiertos"
import { useMatriculaCatalogQuery, useMatriculaStatusOptionsQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { toSelectItemsMap } from "@/lib/catalog-options"

const SEARCH_INPUT_ID = "matricula-search"

const EMPTY_FILTERS: MatriculaFiltersFormInput = {
  search: "",
  statuses: [],
  campus: "",
  shift: "",
  grade: "",
  group: "",
  periodo: "",
  tipo: "",
  metodologia: "",
  solicitud: "",
}

// Aún no hay matrículas complementarias (informe 2.16): el back las devuelve vacías.
const SOLICITUD_ITEMS = [
  { value: "", label: "Todas" },
  { value: "CON_SOLICITUD", label: "Con solicitud pendiente" },
]

const TIPO_ITEMS = [
  { value: "", label: "Todas" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "COMPLEMENTARIA", label: "Complementaria" },
]

interface FilterSelectProps {
  id: string
  label: string
  items: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Lo que se muestra mientras falta el campo anterior de la cascada. */
  blockedPlaceholder?: string
}

function FilterSelect({ id, label, items, value, onChange, disabled, blockedPlaceholder }: FilterSelectProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField
        items={toSelectItemsMap(items)}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder={disabled && blockedPlaceholder ? blockedPlaceholder : items[0]?.label} />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}

interface SearchMatriculaProps {
  filters: MatriculaFiltersFormInput
  applyFilters: (values: MatriculaFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * Búsqueda por nombre o documento y panel de filtros (informe sección 2):
 * Sede → Jornada → Periodo (solo Abiertos, Regla 54) → Grado → Grupo, más
 * Estado y Tipo de matrícula. Son los mismos filtros con los que se exporta.
 */
export function SearchMatricula({ filters, applyFilters, clearAllFilters, activeFilterCount }: SearchMatriculaProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MatriculaFiltersFormInput>(filters)

  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: dependentCatalogs, sedeId, jornadaId } = useMatriculaDependentCatalogsQuery({
    campus: draft.campus || undefined,
    shift: draft.shift || undefined,
    grade: draft.grade ? Number(draft.grade) : undefined,
    periodoId: draft.periodo ? Number(draft.periodo) : null,
  })
  const { data: periodos = [] } = useMatriculaPeriodosAbiertosQuery(
    draft.campus ? sedeId : null,
    draft.shift ? jornadaId : null,
  )
  const { data: STATUS_OPTIONS = [] } = useMatriculaStatusOptionsQuery()
  const { data: metodologias } = useMatriculaCatalogQuery("metodologia")

  // El estado también se escribe dentro del input: `estado:(Cursando)`.
  const syntax: QuerySyntax<MatriculaFiltersFormInput> = {
    empty: EMPTY_FILTERS,
    freeText: { key: "texto", field: "search" },
    terms: [optionsTerm("estado", "statuses", STATUS_OPTIONS)],
  }
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  // Cambiar un campo de la cascada limpia los que dependen de él.
  const CASCADA = ["campus", "shift", "periodo", "grade", "group"] as const
  function setCascada(key: (typeof CASCADA)[number], value: string) {
    const index = CASCADA.indexOf(key)
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      for (const dependiente of CASCADA.slice(index + 1)) next[dependiente] = ""
      return next
    })
  }

  function handleApplyAdvanced() {
    applyFilters({ ...draft, search: freeText })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const campusItems = [{ value: "", label: "Todas" }, ...(catalogs?.campuses ?? []).map((c) => ({ value: c, label: c }))]
  const shiftItems = [{ value: "", label: "Todas" }, ...(dependentCatalogs?.shifts ?? []).map((s) => ({ value: s, label: s }))]
  const periodoItems = [{ value: "", label: "Todos" }, ...periodos]
  const gradeItems = [
    { value: "", label: "Todos" },
    ...(dependentCatalogs?.grades ?? []).map((g) => ({ value: String(g.valor), label: g.nombre })),
  ]
  const groupItems = [
    { value: "", label: "Todos" },
    ...(dependentCatalogs?.groups ?? []).map((g) => ({ value: g.codigo, label: g.codigo })),
  ]
  const statusItems = [{ value: "", label: "Todos" }, ...STATUS_OPTIONS]
  const metodologiaItems = [
    { value: "", label: "Todas" },
    ...(metodologias ?? []).map((m) => ({ value: String(m.id), label: m.nombre })),
  ]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por nombre o documento"
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
        <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2">
          <FilterSelect id="matricula-campus" label="Sede" items={campusItems} value={draft.campus} onChange={(v) => setCascada("campus", v)} />
          <FilterSelect
            id="matricula-shift"
            label="Jornada"
            items={shiftItems}
            value={draft.shift}
            onChange={(v) => setCascada("shift", v)}
            disabled={!draft.campus}
            blockedPlaceholder="Elija la sede primero"
          />
          <FilterSelect
            id="matricula-periodo"
            label="Período"
            items={periodoItems}
            value={draft.periodo}
            onChange={(v) => setCascada("periodo", v)}
            disabled={!draft.shift}
            blockedPlaceholder="Elija la jornada primero"
          />
          <FilterSelect
            id="matricula-grade"
            label="Grado"
            items={gradeItems}
            value={draft.grade}
            onChange={(v) => setCascada("grade", v)}
            disabled={!draft.shift}
            blockedPlaceholder="Elija la jornada primero"
          />
          <FilterSelect
            id="matricula-group"
            label="Grupo"
            items={groupItems}
            value={draft.group}
            onChange={(v) => setCascada("group", v)}
            disabled={!draft.grade}
            blockedPlaceholder="Elija el grado primero"
          />
          <FilterSelect
            id="matricula-status"
            label="Estado"
            items={statusItems}
            value={draft.statuses[0] ?? ""}
            onChange={(v) => setDraft((prev) => ({ ...prev, statuses: v ? [v] : [] }))}
          />
          <FilterSelect
            id="matricula-tipo"
            label="Tipo de matrícula"
            items={TIPO_ITEMS}
            value={draft.tipo}
            onChange={(v) => setDraft((prev) => ({ ...prev, tipo: v }))}
          />
          <FilterSelect
            id="matricula-metodologia"
            label="Metodología"
            items={metodologiaItems}
            value={draft.metodologia}
            onChange={(v) => setDraft((prev) => ({ ...prev, metodologia: v }))}
          />
          <FilterSelect
            id="matricula-solicitud"
            label="Solicitud de retiro"
            items={SOLICITUD_ITEMS}
            value={draft.solicitud}
            onChange={(v) => setDraft((prev) => ({ ...prev, solicitud: v }))}
          />
        </div>
      </SearchQueryBar>
    </div>
  )
}
