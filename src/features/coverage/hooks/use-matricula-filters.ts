import { useCallback, useMemo } from "react"

import { coberturaMatriculaRoute } from "@/router"

import type { MatriculaFiltersFormInput } from "@/features/coverage/api/schema"
import type { MatriculaQueryRequest } from "@/features/coverage/api/types/matricula"

export interface MatriculaFilters {
  filters: MatriculaFiltersFormInput
  queryFilters: MatriculaQueryRequest["filters"]
  applyFilters: (values: MatriculaFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useMatriculaFilters(): MatriculaFilters {
  const search = coberturaMatriculaRoute.useSearch()
  const navigate = coberturaMatriculaRoute.useNavigate()

  const applyFilters = useCallback(
    (values: MatriculaFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        statuses: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      statuses: search.statuses,
    }),
    [search.search, search.statuses],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.statuses?.length ?? 0
    return count
  }, [search.search, search.statuses])

  return {
    filters: {
      search: search.search ?? "",
      statuses: search.statuses ?? [],
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
