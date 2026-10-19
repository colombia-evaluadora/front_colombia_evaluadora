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

import { ESTABLECIMIENTOS, JORNADAS, SEDES } from "@/features/bitacora/api/mock-bitacora"
import { BITACORA_ACCIONES, BITACORA_MODULO_IDS, BITACORA_MODULOS, type BitacoraModulo } from "@/features/bitacora/api/types/bitacora"
import { filtrosVacios, type BitacoraFilters } from "@/features/bitacora/hooks/use-bitacora-filters"

const MODULO_OPTIONS = BITACORA_MODULO_IDS.map((m) => ({ value: m, label: BITACORA_MODULOS[m].nombre }))
const ACCION_OPTIONS = BITACORA_ACCIONES.map((a) => ({ value: a, label: a }))
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

  const entidadesDe = (m: BitacoraModulo) => BITACORA_MODULOS[m].entidades.map((e) => ({ value: e, label: e }))
  const entidadOptions = entidadesDe(filters.modulo)
  const syntax: QuerySyntax<BitacoraFilters> = {
    empty: { ...filtrosVacios(), modulo: filters.modulo, establecimiento: filters.establecimiento, desde: filters.desde, hasta: filters.hasta },
    freeText: { key: "usuario", field: "q" },
    terms: [
      optionTerm("sede", "sede", SEDES),
      optionTerm("jornada", "jornada", JORNADAS),
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
          {esSuperAdmin && draft.modulo !== "administracion" && (
            <Combo
              id="bitacora-establecimiento"
              label="Establecimiento *"
              options={ESTABLECIMIENTOS}
              value={draft.establecimiento}
              onChange={(v) => v && set({ establecimiento: v })}
              obligatorio
            />
          )}
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
          <div className="grid grid-cols-2 gap-3">
            <Combo id="bitacora-sede" label="Sede" options={SEDES} value={draft.sede} onChange={(v) => set({ sede: v })} />
            <Combo
              id="bitacora-jornada"
              label="Jornada"
              options={JORNADAS}
              value={draft.jornada}
              onChange={(v) => set({ jornada: v })}
            />
          </div>
          <Combo
            id="bitacora-entidad"
            label="Entidad"
            options={entidadesDe(draft.modulo)}
            value={draft.entidad}
            onChange={(v) => set({ entidad: v })}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Acción</legend>
            {BITACORA_ACCIONES.map((accion) => (
              <label key={accion} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.accion.includes(accion)}
                  onCheckedChange={(checked) => toggleAccion(accion, checked)}
                />
                {accion}
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
