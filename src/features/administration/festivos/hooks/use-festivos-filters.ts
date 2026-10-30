import { festivosRoute } from "@/router"

import type { TipoFecha } from "@/features/administration/festivos/api/types"

/** Filtros en la forma del buscador (strings; vacío = sin filtro). */
export interface FestivosFilters {
  q: string
  tipo: "" | TipoFecha
  estado: "" | "activo" | "inactivo"
}

export const EMPTY_FESTIVOS_FILTERS: FestivosFilters = { q: "", tipo: "", estado: "" }

/** Búsqueda y filtros en la URL: el enlace abre la misma vista. */
export function useFestivosFilters() {
  const search = festivosRoute.useSearch()
  const navigate = festivosRoute.useNavigate()

  const filters: FestivosFilters = {
    q: search.q ?? "",
    tipo: search.tipo ?? "",
    estado: search.estado ?? "",
  }

  function applyFilters(values: FestivosFilters) {
    navigate({
      search: (prev) => ({
        ...prev,
        q: values.q || undefined,
        tipo: values.tipo || undefined,
        estado: values.estado || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const activeFilterCount = [filters.q, filters.tipo, filters.estado].filter(Boolean).length

  return {
    filters,
    applyFilters,
    clearAllFilters: () => applyFilters(EMPTY_FESTIVOS_FILTERS),
    activeFilterCount,
  }
}
