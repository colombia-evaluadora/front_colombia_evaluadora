import { useCallback, useMemo } from "react"

import { auditoriaRoute } from "@/router"

import type {
  AuditFiltersFormInput,
  AuditFiltersFormValues,
} from "../api/schema"
import type { AuditsQueryRequest } from "../api/types/audit"

export interface AuditSessionFilters {
  filters: AuditFiltersFormInput
  queryFilters: AuditsQueryRequest["filters"]
  applyFilters: (values: AuditFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAuditSessionFilters(): AuditSessionFilters {
  const search = auditoriaRoute.useSearch()
  const navigate = auditoriaRoute.useNavigate()

  const applyFilters = useCallback(
    (values: AuditFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          author: values.author || undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
          startedFrom: values.startedFrom || undefined,
          startedTo: values.startedTo || undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        author: undefined,
        statuses: undefined,
        startedFrom: undefined,
        startedTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: AuditsQueryRequest["filters"] = useMemo(
    () => ({
      author: search.author,
      status: search.statuses,
      startedFrom: search.startedFrom,
      startedTo: search.startedTo,
    }),
    [search.author, search.statuses, search.startedFrom, search.startedTo]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.author) n += 1
    n += search.statuses?.length ?? 0
    if (search.startedFrom || search.startedTo) n += 1
    return n
  }, [search.author, search.statuses, search.startedFrom, search.startedTo])

  return {
    filters: {
      author: search.author ?? "",
      statuses: search.statuses ?? [],
      startedFrom: search.startedFrom ?? "",
      startedTo: search.startedTo ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
