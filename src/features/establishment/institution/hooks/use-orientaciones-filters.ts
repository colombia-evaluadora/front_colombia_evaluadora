import { establishmentsRoute } from "@/router"

import type { OrientacionesFiltersFormInput } from "@/features/establishment/institution/api/schema"

/** Búsqueda libre y filtros Estado y Tema de la pestaña Orientaciones, en la URL. */
export function useOrientacionesFilters() {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()

  const applyFilters = (values: OrientacionesFiltersFormInput) => {
    navigate({
      search: (prev) => ({
        ...prev,
        oSearch: values.search || undefined,
        oEstados: values.estados.length ? values.estados.slice(0, 1) : undefined,
        oTemas: values.temas.length ? values.temas.slice(0, 1) : undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        oSearch: undefined,
        oEstados: undefined,
        oTemas: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const filters: OrientacionesFiltersFormInput = {
    search: search.oSearch ?? "",
    estados: search.oEstados ?? [],
    temas: search.oTemas ?? [],
  }

  return {
    filters,
    applyFilters,
    clearAllFilters,
    activeFilterCount:
      (search.oSearch ? 1 : 0) + (search.oEstados?.length ?? 0) + (search.oTemas?.length ?? 0),
  }
}
