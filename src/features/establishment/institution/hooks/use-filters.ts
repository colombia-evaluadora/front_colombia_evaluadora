import { establishmentsRoute } from "@/router"

import type { EstablishmentFiltersFormInput } from "@/features/establishment/institution/api/schema"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"
import { useListFilters } from "@/features/establishment/shared/hooks/use-list-filters"

export interface EstablishmentsFilters {
  filters: EstablishmentFiltersFormInput
  queryFilters: EstablishmentsQueryRequest["filters"]
  applyFilters: (values: EstablishmentFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useEstablishmentsFilters(): EstablishmentsFilters {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()

  const listFilters = useListFilters({
    listKey: "statuses",
    search: search.search,
    values: search.statuses,
    setSearch: (patch) =>
      navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true }),
  })

  return {
    ...listFilters,
    queryFilters: { search: search.search, status: search.statuses },
  }
}
