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
          campus: values.campus || undefined,
          shift: values.shift || undefined,
          grade: values.grade ? Number(values.grade) : undefined,
          group: values.group || undefined,
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
        campus: undefined,
        shift: undefined,
        grade: undefined,
        group: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      statuses: search.statuses,
      campus: search.campus,
      shift: search.shift,
      grade: search.grade,
      group: search.group,
    }),
    [search.search, search.statuses, search.campus, search.shift, search.grade, search.group],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.statuses?.length ?? 0
    if (search.campus) count += 1
    if (search.shift) count += 1
    if (search.grade != null) count += 1
    if (search.group) count += 1
    return count
  }, [search.search, search.statuses, search.campus, search.shift, search.grade, search.group])

  return {
    filters: {
      search: search.search ?? "",
      statuses: search.statuses ?? [],
      campus: search.campus ?? "",
      shift: search.shift ?? "",
      grade: search.grade != null ? String(search.grade) : "",
      group: search.group ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
