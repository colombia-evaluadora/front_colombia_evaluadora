import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, textTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { DatePicker } from "@/components/date-picker"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import {
  EMPTY_SEGUIMIENTO_FILTERS,
  gradosDeJornada,
  gruposDeGradoJornada,
  type ActividadCatalogEntry,
  type AsignaturaCatalogEntry,
  type CodigoNombreOption,
  type GrupoCatalogEntry,
} from "@/features/academic-management/asistencia/api/ui-mappings"
import type { TipoAsistenciaOption } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import type { SeguimientoFiltersValues } from "@/features/academic-management/asistencia/api/types/asistencia"

interface SearchSeguimientoProps {
  search: string
  onSearchChange: (value: string) => void
  filters: SeguimientoFiltersValues
  applyFilters: (values: SeguimientoFiltersValues) => void
  onClearAll: () => void
  jornadaOptions: CodigoNombreOption[]
  grupoCatalog: GrupoCatalogEntry[]
  asignaturaCatalog: AsignaturaCatalogEntry[]
  asignaturasPorGrupo: Map<number, AsignaturaCatalogEntry[]>
  actividadCatalog: ActividadCatalogEntry[]
  actividadesPorGrupo: Map<number, ActividadCatalogEntry[]>
  tipoAsistenciaOptions: TipoAsistenciaOption[]
}

const PREFIJO_ASIGNATURA = "asig:"
const PREFIJO_ACTIVIDAD = "act:"

const TODOS_ITEM = { value: "", label: "Todos" }

/** `SeguimientoFiltersValues` + la búsqueda libre, para `query-syntax`: ahí viajan juntos como un solo texto. */
type QueryFilters = SeguimientoFiltersValues & { search: string }

const EMPTY_QUERY_FILTERS: QueryFilters = { ...EMPTY_SEGUIMIENTO_FILTERS, search: "" }

export function SearchSeguimiento({
  search,
  onSearchChange,
  filters,
  applyFilters,
  onClearAll,
  jornadaOptions,
  grupoCatalog,
  asignaturaCatalog,
  asignaturasPorGrupo,
  actividadCatalog,
  actividadesPorGrupo,
  tipoAsistenciaOptions,
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
    () => [TODOS_ITEM, ...gradosDeJornada(grupoCatalog, draft.jornada)],
    [grupoCatalog, draft.jornada],
  )
  const grupoItems = useMemo(
    () => [
      TODOS_ITEM,
      ...gruposDeGradoJornada(grupoCatalog, draft.jornada, draft.grado).map((g) => ({
        value: String(g.value),
        label: g.label,
      })),
    ],
    [grupoCatalog, draft.jornada, draft.grado],
  )
  const asignaturaItems = useMemo(() => {
    if (!draft.grupo) return [TODOS_ITEM]
    const grupoId = Number(draft.grupo)
    const asignaturas = asignaturasPorGrupo.get(grupoId) ?? []
    const actividades = actividadesPorGrupo.get(grupoId) ?? []
    return [
      TODOS_ITEM,
      ...asignaturas.map((a) => ({ value: `${PREFIJO_ASIGNATURA}${a.value}`, label: a.label })),
      ...actividades.map((a) => ({ value: `${PREFIJO_ACTIVIDAD}${a.value}`, label: a.label })),
    ]
  }, [asignaturasPorGrupo, actividadesPorGrupo, draft.grupo])

  const draftAsignaturaValue = draft.actividad
    ? `${PREFIJO_ACTIVIDAD}${draft.actividad}`
    : draft.asignatura
      ? `${PREFIJO_ASIGNATURA}${draft.asignatura}`
      : ""

  function handleAsignaturaChange(value: string | null) {
    if (!value) {
      setDraft((d) => ({ ...d, asignatura: "", actividad: "" }))
    } else if (value.startsWith(PREFIJO_ACTIVIDAD)) {
      setDraft((d) => ({ ...d, actividad: value.slice(PREFIJO_ACTIVIDAD.length), asignatura: "" }))
    } else {
      setDraft((d) => ({ ...d, asignatura: value.slice(PREFIJO_ASIGNATURA.length), actividad: "" }))
    }
  }
  const tipoAsistenciaItems = useMemo(
    () => [TODOS_ITEM, ...tipoAsistenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))],
    [tipoAsistenciaOptions],
  )

  const cadenaIniciada = Boolean(draft.jornada || draft.grado || draft.grupo || draft.asignatura || draft.actividad)
  const canApply = !cadenaIniciada || Boolean(draft.grupo)

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

  const syntax = useMemo<QuerySyntax<QueryFilters>>(
    () => ({
      empty: EMPTY_QUERY_FILTERS,
      freeText: { key: "texto", field: "search" },
      terms: [
        textTerm("desde", "fechaDesde"),
        textTerm("hasta", "fechaHasta"),
        optionTerm("jornada", "jornada", jornadaOptions),
        optionTerm("grado", "grado", gradosDeJornada(grupoCatalog, "")),
        optionTerm(
          "grupo",
          "grupo",
          grupoCatalog.map((g) => ({ value: String(g.value), label: `${g.grado}${g.label}` })),
        ),
        optionTerm(
          "asignatura",
          "asignatura",
          asignaturaCatalog.map((a) => ({ value: String(a.value), label: a.label })),
        ),
        optionTerm(
          "actividad",
          "actividad",
          actividadCatalog.map((a) => ({ value: String(a.value), label: a.label })),
        ),
        optionTerm(
          "tipo",
          "tipoAsistencia",
          tipoAsistenciaOptions.map((o) => ({ value: String(o.value), label: o.label })),
        ),
      ],
    }),
    [jornadaOptions, grupoCatalog, asignaturaCatalog, actividadCatalog, tipoAsistenciaOptions],
  )

  const combinedFilters = useMemo<QueryFilters>(() => ({ ...filters, search }), [filters, search])

  const { search: queryText, setSearch: setQueryText } = useQuerySearch({
    syntax,
    filters: combinedFilters,
    applyFilters: (next) => {
      const { search: nextSearch, ...nextFilters } = next
      onSearchChange(nextSearch)
      applyFilters(nextFilters)
    },
  })

  return (
    <SearchQueryBar
      id="seguimiento-search"
      label="Buscar por nombre, grupo o asignatura"
      placeholder="Buscar por"
      value={queryText}
      onValueChange={setQueryText}
      onClearAll={handleClearAll}
      activeFilterCount={activeFilterCount}
      badgeCount={badgeCount}
      open={open}
      onOpenChange={setOpen}
      onApply={handleApply}
      applyDisabled={!canApply}
      size="lg"
      className="sm:w-full max-w-4xl"
    >
      <div className="flex flex-col gap-3 px-4">
        {!canApply && (
          <p className="text-xs text-yellow">
            Jornada y Grado son solo para ayudarte a encontrar el Grupo: elegí también un Grupo para
            poder aplicar el filtro.
          </p>
        )}
        <FieldSet>
          <FieldLegend variant="label">Rango de fecha</FieldLegend>
          <div className="grid grid-cols-2 gap-3">
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="seguimiento-fecha-desde">Desde</FieldLabel>
              <DatePicker
                id="seguimiento-fecha-desde"
                size="sm"
                maxDate={draft.fechaHasta ? parseDateValue(draft.fechaHasta) : undefined}
                value={parseDateValue(draft.fechaDesde)}
                onChange={(date) => setDraft((d) => ({ ...d, fechaDesde: formatDateValue(date) }))}
              />
            </Field>
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="seguimiento-fecha-hasta">Hasta</FieldLabel>
              <DatePicker
                id="seguimiento-fecha-hasta"
                size="sm"
                minDate={draft.fechaDesde ? parseDateValue(draft.fechaDesde) : undefined}
                value={parseDateValue(draft.fechaHasta)}
                onChange={(date) => setDraft((d) => ({ ...d, fechaHasta: formatDateValue(date) }))}
              />
            </Field>
          </div>
        </FieldSet>

        <div className="grid grid-cols-2 gap-3">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="seguimiento-jornada">Jornada</FieldLabel>
            <ComboboxField
              items={Object.fromEntries(jornadaItems.map((item) => [item.value, item.label]))}
              value={draft.jornada}
              // Raíz de esta cadena: cambiarla borra Grado/Grupo/Asignatura.
              onValueChange={(value) =>
                setDraft((d) => ({ ...d, jornada: value ?? "", grado: "", grupo: "", asignatura: "", actividad: "" }))
              }
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
              disabled={!draft.jornada}
              items={Object.fromEntries(gradoItems.map((item) => [item.value, item.label]))}
              value={draft.grado}
              onValueChange={(value) =>
                setDraft((d) => ({ ...d, grado: value ?? "", grupo: "", asignatura: "", actividad: "" }))
              }
            >
              <ComboboxFieldTrigger id="seguimiento-grado" size="sm" className="w-full">
                <ComboboxFieldValue placeholder={draft.jornada ? "Todos" : "Elegí Jornada primero"} />
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
              // Depende de Grado -- al cambiarlo, Asignatura/Actividad se borra.
              onValueChange={(value) => setDraft((d) => ({ ...d, grupo: value ?? "", asignatura: "", actividad: "" }))}
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
              value={draftAsignaturaValue}
              onValueChange={handleAsignaturaChange}
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
        </div>

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
