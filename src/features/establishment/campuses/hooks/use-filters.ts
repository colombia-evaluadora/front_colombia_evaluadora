import { campusesRoute } from "@/router"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface CampusesFilters {
  filters: CampusFiltersFormInput
  queryFilters: CampusesQueryRequest["filters"]
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useCampusesFilters(): CampusesFilters {
  const search = campusesRoute.useSearch()
  const navigate = campusesRoute.useNavigate()

  const applyFilters = (values: CampusFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          zones: values.zones.length ? values.zones : undefined,
          page: 0,
        }),
        replace: true,
      })
    }

  const clearAllFilters = () => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        zones: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const queryFilters = {
      search: search.search,
      zones: search.zones,
    }

  const activeFilterCount = (() => {
    let count = 0
    if (search.search) count += 1
    count += search.zones?.length ?? 0
    return count
  })()

  const filtrosForm = {
    search: search.search ?? "",
    zones: search.zones ?? [],
  }
  // UI asistida: `APLICAR_FILTROS` usa el mismo `applyFilters` que la persona.
  useFiltrosDeListado(filtrosForm, applyFilters)

  return {
    filters: filtrosForm,
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}