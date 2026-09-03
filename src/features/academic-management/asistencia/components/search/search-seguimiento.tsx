import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import {
  EMPTY_SEGUIMIENTO_FILTERS,
  gradosDelCatalogo,
  gruposDeGrado,
  TIPO_ASISTENCIA_OPTIONS,
  type AsignaturaCatalogEntry,
  type GrupoCatalogEntry,
} from "@/features/academic-management/asistencia/api/ui-mappings"
import type { SeguimientoFiltersValues } from "@/features/academic-management/asistencia/api/types/asistencia"

export interface SeguimientoJornadaOption {
  value: string
  label: string
}

interface SearchSeguimientoProps {
  search: string
  onSearchChange: (value: string) => void
  filters: SeguimientoFiltersValues
  applyFilters: (values: SeguimientoFiltersValues) => void
  onClearAll: () => void
  jornadaOptions: SeguimientoJornadaOption[]
  grupoCatalog: GrupoCatalogEntry[]
  asignaturasPorGrupo: Map<number, AsignaturaCatalogEntry[]>
}

const TODOS_ITEM = { value: "", label: "Todos" }

const tipoAsistenciaItems = [
  TODOS_ITEM,
  ...TIPO_ASISTENCIA_OPTIONS.map((o) => ({ value: String(o.value), label: o.label })),
]

export function SearchSeguimiento({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  jornadaOptions,
  grupoCatalog,
  asignaturasPorGrupo,
}: SearchSeguimientoProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  const badgeCount = Object.values(filters).filter(Boolean).length
  const activeFilterCount = badgeCount + (search ? 1 : 0)

  const jornadaItems = useMemo(() => [TODOS_ITEM, ...jornadaOptions], [jornadaOptions])

  const gradoItems = useMemo(
    () => [TODOS_ITEM, ...gradosDelCatalogo(grupoCatalog).map((g) => ({ value: g, label: g }))],
    [grupoCatalog],
  )
  const grupoItems = useMemo(
    () => [
      TODOS_ITEM,
      ...gruposDeGrado(grupoCatalog, draft.grado).map((g) => ({ value: String(g.value), label: g.label })),
    ],
    [grupoCatalog, draft.grado],
  )
  const asignaturaItems = useMemo(() => {
    const opciones = draft.grupo ? (asignaturasPorGrupo.get(Number(draft.grupo)) ?? []) : []
    return [TODOS_ITEM, ...opciones.map((a) => ({ value: String(a.value), label: a.label }))]
  }, [asignaturasPorGrupo, draft.grupo])

  const cadenaIniciada = Boolean(draft.grado || draft.grupo || draft.asignatura)
  const cadenaCompleta = Boolean(draft.grado && draft.grupo && draft.asignatura)
  const canApply = cadenaCompleta || !cadenaIniciada

  function handleApply() {
    if (!canApply) return
    applyFilters(draft)
    setOpen(false)
  }

  function handleClearAll() {
    onClearAll()
    setDraft(EMPTY_SEGUIMIENTO_FILTERS)
    setOpen(false)
  }

  return (
    <SearchQueryBar
      id="seguimiento-search"
      label={null}
      placeholder="Buscar por nombre, grupo o asignatura…"
      value={search}
      onValueChange={onSearchChange}
      onClearAll={handleClearAll}
      activeFilterCount={activeFilterCount}
      badgeCount={badgeCount}
      open={open}
      onOpenChange={setOpen}
      onApply={handleApply}
      applyDisabled={!canApply}
      size="sm"
      className="sm:w-full max-w-2xl"
    >
      <div className="flex flex-col gap-3 px-4">
        {!canApply && (
          <p className="text-xs text-yellow">
            Elegí Grado, Grupo y Asignatura para poder aplicar ese filtro.
          </p>
        )}
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="seguimiento-jornada">Jornada</FieldLabel>
          <ComboboxField
            items={Object.fromEntries(jornadaItems.map((item) => [item.value, item.label]))}
            value={draft.jornada}
            onValueChange={(value) => setDraft((d) => ({ ...d, jornada: value ?? "" }))}
          >
            <ComboboxFieldTrigger id="seguimiento-jornada" size="sm" className="w-full">
              <ComboboxFieldValue placeholder="Todos" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {jornadaItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="seguimiento-grado">Grado</FieldLabel>
          <ComboboxField
            items={Object.fromEntries(gradoItems.map((item) => [item.value, item.label]))}
            value={draft.grado}
            // Raíz de esta cadena: cambiarla borra Grupo/Asignatura.
            onValueChange={(value) =>
              setDraft((d) => ({ ...d, grado: value ?? "", grupo: "", asignatura: "" }))
            }
          >
            <ComboboxFieldTrigger id="seguimiento-grado" size="sm" className="w-full">
              <ComboboxFieldValue placeholder="Todos" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {gradoItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="seguimiento-grupo">Grupo</FieldLabel>
          <ComboboxField
            disabled={!draft.grado}
            items={Object.fromEntries(grupoItems.map((item) => [item.value, item.label]))}
            value={draft.grupo}
            // Grupo depende de Grado: al cambiarlo, Asignatura se borra.
            onValueChange={(value) => setDraft((d) => ({ ...d, grupo: value ?? "", asignatura: "" }))}
          >
            <ComboboxFieldTrigger id="seguimiento-grupo" size="sm" className="w-full">
              <ComboboxFieldValue placeholder={draft.grado ? "Todos" : "Elegí Grado primero"} />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {grupoItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="seguimiento-asignatura">Asignatura</FieldLabel>
          <ComboboxField
            disabled={!draft.grupo}
            items={Object.fromEntries(asignaturaItems.map((item) => [item.value, item.label]))}
            value={draft.asignatura}
            onValueChange={(value) => setDraft((d) => ({ ...d, asignatura: value ?? "" }))}
          >
            <ComboboxFieldTrigger id="seguimiento-asignatura" size="sm" className="w-full">
              <ComboboxFieldValue placeholder={draft.grupo ? "Todos" : "Elegí Grupo primero"} />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {asignaturaItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        {/* Independiente de la cadena grado→asignatura de arriba: se
            puede aplicar solo, sin los otros 3 completos. */}
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="seguimiento-tipo-asistencia">Tipo de asistencia</FieldLabel>
          <ComboboxField
            items={Object.fromEntries(tipoAsistenciaItems.map((item) => [item.value, item.label]))}
            value={draft.tipoAsistencia}
            onValueChange={(value) => setDraft((d) => ({ ...d, tipoAsistencia: value ?? "" }))}
          >
            <ComboboxFieldTrigger id="seguimiento-tipo-asistencia" size="sm" className="w-full">
              <ComboboxFieldValue placeholder="Todos" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {tipoAsistenciaItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      </div>
    </SearchQueryBar>
  )
}
