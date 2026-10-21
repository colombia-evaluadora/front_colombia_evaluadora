import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, optionsTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"
import { useSedeJornadasActivasQuery } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useBitacoraSedesQuery } from "@/features/bitacora/api/query/use-bitacora-sedes-query"
import { useBitacoraEntidadesQuery } from "@/features/bitacora/api/query/use-bitacora-entidades-query"
import {
  BITACORA_ACCION_IDS,
  BITACORA_ACCIONES,
  BITACORA_MODULO_IDS,
  BITACORA_MODULOS,
  type BitacoraModulo,
} from "@/features/bitacora/api/types/bitacora"
import { filtrosVacios, type BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

const MODULO_OPTIONS = BITACORA_MODULO_IDS.map((m) => ({ value: m, label: BITACORA_MODULOS[m] }))
const ACCION_OPTIONS = BITACORA_ACCION_IDS.map((a) => ({ value: a, label: BITACORA_ACCIONES[a] }))
const RANGO_INVALIDO = "La fecha Hasta no puede ser anterior a la fecha Desde."

interface SearchBitacoraProps {
  filters: BitacoraFilters
  applyFilters: (values: BitacoraFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
  /** Solo el Superadministrador elige establecimiento; el resto queda fijo en el suyo. */
  esSuperAdmin: boolean
}

/** Texto libre = usuario (nombre o documento); el resto en el panel de filtros. */
export function SearchBitacora({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  esSuperAdmin,
}: SearchBitacoraProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  const toOptions = (rows: { id: number; name: string }[] = []) =>
    rows.map((r) => ({ value: String(r.id), label: r.name }))
  const establecimientos = toOptions(useEstablishmentsOptionsQuery(esSuperAdmin).data)
  // Las sedes dependen del establecimiento: las del panel, del que se está eligiendo.
  const toSedes = (rows: { id: number; nombre: string }[] = []) =>
    rows.map((s) => ({ value: String(s.id), label: s.nombre }))
  const sedes = toSedes(useBitacoraSedesQuery(filters.establecimiento).data)
  const sedesDraft = toSedes(useBitacoraSedesQuery(draft.establecimiento).data)
  // Con sede elegida, sus jornadas; sin sede (o sin respuesta), el catálogo general.
  const catalogoJornadas = toOptions(useJornadasQuery().data)
  const jornadasDe = (rows: { id: number; nombre: string }[] | undefined) =>
    rows?.length ? rows.map((j) => ({ value: String(j.id), label: j.nombre })) : catalogoJornadas
  const jornadas = jornadasDe(useSedeJornadasActivasQuery(filters.sede ? Number(filters.sede) : null).data)
  const jornadasDraft = jornadasDe(useSedeJornadasActivasQuery(draft.sede ? Number(draft.sede) : null).data)
  const toEntidades = (rows: { codigo: string; nombre: string }[] = []) =>
    rows.map((e) => ({ value: e.codigo, label: e.nombre }))
  const entidadOptions = toEntidades(useBitacoraEntidadesQuery(filters.modulo).data)
  const entidadesDraft = toEntidades(useBitacoraEntidadesQuery(draft.modulo).data)
  const syntax: QuerySyntax<BitacoraFilters> = {
    empty: { ...filtrosVacios(), modulo: filters.modulo, establecimiento: filters.establecimiento, desde: filters.desde, hasta: filters.hasta },
    freeText: { key: "usuario", field: "q" },
    terms: [
      optionTerm("sede", "sede", sedes),
      optionTerm("jornada", "jornada", jornadas),
      optionTerm("entidad", "entidad", entidadOptions),
      optionsTerm("accion", "accion", ACCION_OPTIONS),
    ],
  }
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Al abrir, el panel arranca con los filtros vigentes.
  function handleOpenChange(next: boolean) {
    if (next) setDraft(filters)
    setOpen(next)
  }

  const rangoInvalido = draft.desde && draft.hasta && draft.hasta < draft.desde
  const set = (patch: Partial<BitacoraFilters>) => setDraft((d) => ({ ...d, ...patch }))

  function toggleAccion(accion: string, checked: boolean) {
    set({ accion: checked ? [...draft.accion, accion] : draft.accion.filter((a) => a !== accion) })
  }

  function handleApply() {
    if (rangoInvalido) return
    applyFilters({ ...draft, q: freeText })
    setOpen(false)
  }

  // "Limpiar filtros" del panel: conserva módulo, establecimiento y la búsqueda.
  function handleClearFilters() {
    const next = { ...filtrosVacios(), modulo: draft.modulo, establecimiento: draft.establecimiento, q: freeText }
    setDraft(next)
    applyFilters(next)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id="bitacora-search"
        placeholder="Buscar por usuario: nombre o documento"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        badgeCount={activeFilterCount - (filters.q ? 1 : 0)}
        open={open}
        onOpenChange={handleOpenChange}
        onApply={handleApply}
        applyDisabled={Boolean(rangoInvalido)}
        size="sm"
      >
        <div className="flex flex-col gap-3 px-4">
          <Combo
            id="bitacora-modulo"
            label="Módulo *"
            options={MODULO_OPTIONS}
            value={draft.modulo}
            // Cada módulo tiene sus entidades: al cambiarlo se quita la elegida.
            onChange={(v) => v && set({ modulo: v as BitacoraModulo, entidad: "" })}
            obligatorio
          />
          {esSuperAdmin && draft.modulo !== "ADMINISTRACION" && (
            <Combo
              id="bitacora-establecimiento"
              label="Establecimiento *"
              options={establecimientos}
              value={draft.establecimiento}
              // Otro establecimiento, otras sedes: se quita la elegida.
              onChange={(v) => v && set({ establecimiento: v, sede: "", jornada: "" })}
              obligatorio
            />
          )}
          {/* Alcance de mayor a menor; la sede va a todo el ancho: sus nombres son largos. */}
          <Combo id="bitacora-sede" label="Sede" options={sedesDraft} value={draft.sede} onChange={(v) => set({ sede: v, jornada: "" })} />
          <div className="grid grid-cols-2 gap-3">
            <Combo
              id="bitacora-jornada"
              label="Jornada"
              options={jornadasDraft}
              value={draft.jornada}
              onChange={(v) => set({ jornada: v })}
            />
            <Combo
              id="bitacora-entidad"
              label="Entidad"
              options={entidadesDraft}
              value={draft.entidad}
              onChange={(v) => set({ entidad: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="bitacora-desde">Desde *</FieldLabel>
              <DatePicker
                id="bitacora-desde"
                size="sm"
                value={parseDateValue(draft.desde)}
                maxDate={new Date()}
                onChange={(d) => d && set({ desde: formatDateValue(d) })}
              />
            </Field>
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={rangoInvalido || undefined}>
              <FieldLabel htmlFor="bitacora-hasta">Hasta *</FieldLabel>
              <DatePicker
                id="bitacora-hasta"
                size="sm"
                value={parseDateValue(draft.hasta)}
                minDate={parseDateValue(draft.desde)}
                maxDate={new Date()}
                aria-invalid={Boolean(rangoInvalido)}
                onChange={(d) => d && set({ hasta: formatDateValue(d) })}
              />
            </Field>
          </div>
          {rangoInvalido && <FieldError>{RANGO_INVALIDO}</FieldError>}
          <fieldset className="grid grid-cols-2 gap-x-3 gap-y-2">
            <legend className="mb-2 text-sm font-medium">Acción</legend>
            {BITACORA_ACCION_IDS.map((accion) => (
              <label key={accion} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.accion.includes(accion)}
                  onCheckedChange={(checked) => toggleAccion(accion, checked)}
                />
                {BITACORA_ACCIONES[accion]}
              </label>
            ))}
          </fieldset>
        </div>
      </SearchQueryBar>
    </div>
  )
}

function Combo({
  id,
  label,
  options,
  value,
  onChange,
  obligatorio,
}: {
  id: string
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  obligatorio?: boolean
}) {
  // Un obligatorio no ofrece "Todos": se cambia, pero no se quita.
  const items = obligatorio ? options : [{ value: "", label: "Todos" }, ...options]
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField
        items={Object.fromEntries(items.map((item) => [item.value, item.label]))}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder="Todos" />
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
