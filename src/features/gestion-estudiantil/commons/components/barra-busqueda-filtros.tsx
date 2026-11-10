import type { ReactNode } from "react"

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
      {children}
    </SearchQueryBar>
  )
}
