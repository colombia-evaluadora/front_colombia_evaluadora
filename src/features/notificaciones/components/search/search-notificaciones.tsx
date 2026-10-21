import { useEffect, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { toSelectItemsMap } from "@/lib/catalog-options"

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
export function SearchNotificaciones({
  filters,
  applyFilters,
  onClearAll,
  activeFilterCount,
}: SearchNotificacionesProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(filters)
  const { search, setSearch } = useQuerySearch({
    syntax: notificacionesSyntax,
    filters,
    applyFilters,
  })

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
      <div className="flex flex-col gap-4 px-4">
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="filtro-notif-tipo">Tipo</FieldLabel>
          <ComboboxField
            items={toSelectItemsMap(CATEGORIA_OPTIONS)}
            value={draft.categoria}
            onValueChange={(value) => setDraft((d) => ({ ...d, categoria: value ?? "" }))}
          >
            <ComboboxFieldTrigger id="filtro-notif-tipo" size="sm" className="w-full">
              <ComboboxFieldValue placeholder="Todos" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {CATEGORIA_OPTIONS.map((o) => (
                <ComboboxFieldItem key={o.value} value={o.value}>
                  {o.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="filtro-notif-estado">Estado</FieldLabel>
          <ComboboxField
            items={toSelectItemsMap(ESTADO_OPTIONS)}
            value={draft.estado}
            onValueChange={(value) => setDraft((d) => ({ ...d, estado: value ?? "" }))}
          >
            <ComboboxFieldTrigger id="filtro-notif-estado" size="sm" className="w-full">
              <ComboboxFieldValue placeholder="Todas" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {ESTADO_OPTIONS.map((o) => (
                <ComboboxFieldItem key={o.value} value={o.value}>
                  {o.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      </div>
    </SearchQueryBar>
  )
}
