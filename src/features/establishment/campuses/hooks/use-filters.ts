import { campusesRoute } from "@/router"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"
import { useListFilters } from "@/features/establishment/shared/hooks/use-list-filters"

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

  const listFilters = useListFilters({
    listKey: "zones",
    search: search.search,
    values: search.zones,
    setSearch: (patch) =>
      navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true }),
  })

  return {
    ...listFilters,
    queryFilters: { search: search.search, zones: search.zones },
  }
}
