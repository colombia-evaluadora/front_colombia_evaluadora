import { administradoresTerritorialesRoute } from "@/router"

import type { SuperadministradoresFilters } from "@/features/administration/superadministradores/hooks/use-superadministradores-filters"

/** Misma forma que el buscador de Superadministradores: texto libre y estado. */
export type AdministradoresFilters = SuperadministradoresFilters

export const EMPTY_SUPERVISORES_FILTERS: AdministradoresFilters = { q: "", estado: "" }

/** Búsqueda y filtros en la URL: el enlace abre la misma vista. */
export function useAdministradoresFilters() {
  const search = administradoresTerritorialesRoute.useSearch()
  const navigate = administradoresTerritorialesRoute.useNavigate()

  const filters: AdministradoresFilters = { q: search.q ?? "", estado: search.estado ?? "" }

  function applyFilters(values: AdministradoresFilters) {
    navigate({
      search: (prev) => ({ ...prev, q: values.q || undefined, estado: values.estado || undefined, page: 0 }),
      replace: true,
    })
  }

  return {
    filters,
    applyFilters,
    clearAllFilters: () => applyFilters(EMPTY_SUPERVISORES_FILTERS),
    activeFilterCount: [filters.q, filters.estado].filter(Boolean).length,
  }
}
