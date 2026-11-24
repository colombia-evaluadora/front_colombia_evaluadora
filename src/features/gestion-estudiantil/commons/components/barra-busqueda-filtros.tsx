import type { ReactNode } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchQueryBar } from "@/components/search/search-query-bar"

/** Subconjunto de lo que devuelve `useSearchFiltros` (sin el borrador, que depende de la forma de los filtros). */
interface EstadoBarra {
  queryText: string
  setQueryText: (value: string) => void
  handleClearAll: () => void
  handleClearFilters: () => void
  activeFilterCount: number
  badgeCount: number
  open: boolean
  setOpen: (open: boolean) => void
  handleApply: () => void
  /** Texto libre del panel («Contiene las palabras»), sincronizado con la barra al aplicar. */
  draftSearch?: string
  setDraftSearch?: (value: string) => void
}

interface Props {
  id: string
  placeholder: string
  /** Lo que devuelve `useSearchFiltros`: texto, borrador y acciones del panel. */
  estado: EstadoBarra
  /** Campos del panel de filtros. */
  children: ReactNode
}

/** Barra de búsqueda con panel de filtros de los listados de Gestión Estudiantil (citaciones, compromisos, reconocimientos). */
export function BarraBusquedaFiltros({ id, placeholder, estado: s, children }: Props) {
  return (
    <SearchQueryBar
      id={id}
      label={null}
      placeholder={placeholder}
      value={s.queryText}
      onValueChange={s.setQueryText}
      onClearAll={s.handleClearAll}
      onClearFilters={s.handleClearFilters}
      activeFilterCount={s.activeFilterCount}
      badgeCount={s.badgeCount}
      open={s.open}
      onOpenChange={s.setOpen}
      onApply={s.handleApply}
      size="lg"
      className="sm:w-full max-w-xl"
    >
      {s.setDraftSearch && (
        <div className="px-4 pb-2">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={`${id}-contiene`}>Contiene las palabras</FieldLabel>
            <Input
              id={`${id}-contiene`}
              value={s.draftSearch ?? ""}
              onChange={(e) => s.setDraftSearch?.(e.target.value)}
            />
          </Field>
        </div>
      )}
      {children}
    </SearchQueryBar>
  )
}
