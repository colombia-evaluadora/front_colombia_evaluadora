import { areasOficialesRoute } from "@/router"

/** Filtros en la forma del buscador (strings; vacío = sin filtro). */
export interface AreasOficialesFilters {
  q: string
  /** pk de `TNIVEL_ENSENANZA`. */
  nivel: string
  estado: "" | "activa" | "inactiva"
}

export const EMPTY_AREAS_OFICIALES_FILTERS: AreasOficialesFilters = { q: "", nivel: "", estado: "" }

/** Búsqueda y filtros en la URL: el enlace abre la misma vista. */
export function useAreasOficialesFilters() {
  const search = areasOficialesRoute.useSearch()
  const navigate = areasOficialesRoute.useNavigate()

  const filters: AreasOficialesFilters = {
    q: search.q ?? "",
    nivel: search.nivel ?? "",
    estado: search.estado ?? "",
  }

  function applyFilters(values: AreasOficialesFilters) {
    navigate({
      search: (prev) => ({
        ...prev,
        q: values.q || undefined,
        nivel: values.nivel || undefined,
        estado: values.estado || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const activeFilterCount = [filters.q, filters.nivel, filters.estado].filter(Boolean).length

  return {
    filters,
    applyFilters,
    clearAllFilters: () => applyFilters(EMPTY_AREAS_OFICIALES_FILTERS),
    activeFilterCount,
  }
}
