import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import {
  CATEGORIA_OPTIONS,
  ESTADO_OPTIONS,
  notificacionesSyntax,
  type NotificacionesQueryFilters,
} from "@/features/notificaciones/components/search/query-syntax"

interface SearchNotificacionesProps {
  filters: NotificacionesQueryFilters
  applyFilters: (filters: NotificacionesQueryFilters) => void
  onClearAll: () => void
  activeFilterCount: number
}

/** Buscador estilo Gmail de la bandeja: `tipo:(Planeador) estado:(No leídas)`. */
export function SearchNotificaciones({ filters, applyFilters, onClearAll, activeFilterCount }: SearchNotificacionesProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)
  const { search, setSearch } = useQuerySearch({ syntax: notificacionesSyntax, filters, applyFilters })

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  return (
    <SearchQueryBar
      id="buscar-notificaciones"
      placeholder="Buscar notificaciones"
      value={search}
      onValueChange={setSearch}
      onClearAll={() => {
        setSearch("")
        onClearAll()
      }}
      onClearFilters={() => {
        const next = { ...filters, categoria: "", estado: "" }
        setDraft(next)
        applyFilters(next)
      }}
      activeFilterCount={activeFilterCount + (filters.texto ? 1 : 0)}
      badgeCount={activeFilterCount}
      open={open}
      onOpenChange={setOpen}
      onApply={() => {
        applyFilters(draft)
        setOpen(false)
      }}
      size="sm"
    >
      <Field>
        <FieldLabel htmlFor="filtro-notif-tipo">Tipo</FieldLabel>
        <NativeSelect
          id="filtro-notif-tipo"
          value={draft.categoria}
          onChange={(e) => setDraft((d) => ({ ...d, categoria: e.target.value }))}
        >
          <NativeSelectOption value="">Todos</NativeSelectOption>
          {CATEGORIA_OPTIONS.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="filtro-notif-estado">Estado</FieldLabel>
        <NativeSelect
          id="filtro-notif-estado"
          value={draft.estado}
          onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value }))}
        >
          <NativeSelectOption value="">Todas</NativeSelectOption>
          {ESTADO_OPTIONS.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </SearchQueryBar>
  )
}
