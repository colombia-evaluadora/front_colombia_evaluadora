import { campusesRoute } from "@/router"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"
import type { CampusStatus, CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import { useFiltrosDeListado } from "@/features/assistant/lib/registro-ui"

export interface CampusesFilters {
  filters: CampusFiltersFormInput
  queryFilters: CampusesQueryRequest["filters"]
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

const LIST_KEYS = ["establishments", "zones", "workSchedules", "statuses"] as const

/** Búsqueda libre y filtros Establecimiento, Zona, Jornada y Estado, sincronizados con la URL. */
export function useCampusesFilters(): CampusesFilters {
  const search = campusesRoute.useSearch()
  const navigate = campusesRoute.useNavigate()

  const applyFilters = (values: CampusFiltersFormInput) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: values.search || undefined,
        ...Object.fromEntries(LIST_KEYS.map((key) => [key, values[key].length ? values[key] : undefined])),
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
        ...Object.fromEntries(LIST_KEYS.map((key) => [key, undefined])),
        page: 0,
      }),
      replace: true,
    })
  }

  const filters: CampusFiltersFormInput = {
    search: search.search ?? "",
    establishments: search.establishments ?? [],
    zones: search.zones ?? [],
    workSchedules: search.workSchedules ?? [],
    statuses: search.statuses ?? [],
  }
  // UI asistida: `APLICAR_FILTROS` usa el mismo `applyFilters` que la persona.
  useFiltrosDeListado(filters, applyFilters)

  return {
    filters,
    queryFilters: {
      search: search.search,
      establishments: search.establishments?.map(Number).filter(Number.isFinite),
      zones: search.zones,
      workSchedules: search.workSchedules,
      statuses: search.statuses?.filter((s): s is CampusStatus => s === "A" || s === "I"),
    },
    applyFilters,
    clearAllFilters,
    activeFilterCount:
      (search.search ? 1 : 0) + LIST_KEYS.reduce((total, key) => total + (search[key]?.length ?? 0), 0),
  }
}
