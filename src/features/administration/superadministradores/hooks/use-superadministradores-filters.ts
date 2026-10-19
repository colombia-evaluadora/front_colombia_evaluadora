import { superadministradoresRoute } from "@/router"

/** Filtros en la forma del buscador (strings; vacío = sin filtro). */
export interface SuperadministradoresFilters {
  /** Nombre, número de documento o correo. */
  q: string
  estado: "" | "activo" | "inactivo"
}

export const EMPTY_SUPERADMINISTRADORES_FILTERS: SuperadministradoresFilters = { q: "", estado: "" }

/** Búsqueda y filtros en la URL: el enlace abre la misma vista. */
export function useSuperadministradoresFilters() {
  const search = superadministradoresRoute.useSearch()
  const navigate = superadministradoresRoute.useNavigate()

  const filters: SuperadministradoresFilters = {
    q: search.q ?? "",
    estado: search.estado ?? "",
  }

  function applyFilters(values: SuperadministradoresFilters) {
    navigate({
      search: (prev) => ({
        ...prev,
        q: values.q || undefined,
        estado: values.estado || undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const activeFilterCount = [filters.q, filters.estado].filter(Boolean).length

  return {
    filters,
    applyFilters,
    clearAllFilters: () => applyFilters(EMPTY_SUPERADMINISTRADORES_FILTERS),
    activeFilterCount,
  }
}
