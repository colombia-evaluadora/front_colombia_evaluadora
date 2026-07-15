import { useCallback, useMemo } from "react"

import { auditoriaTablaDetalleRoute } from "@/router"

import type {
  TableOperationsFiltersFormInput,
  TableOperationsFiltersFormValues,
} from "../api/schema"
import type { TableOperationsQueryRequest } from "../api/types/audit-table"

export interface TableOperationsFilters {
  filters: TableOperationsFiltersFormInput
  queryFilters: TableOperationsQueryRequest["filters"]
  applyFilters: (values: TableOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useTableOperationsFilters(): TableOperationsFilters {
  const search = auditoriaTablaDetalleRoute.useSearch()
  const navigate = auditoriaTablaDetalleRoute.useNavigate()

  const applyFilters = useCallback(
    (values: TableOperationsFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          author: values.author || undefined,
          operations: values.operations.length ? values.operations : undefined,
          occurredFrom: values.occurredFrom || undefined,
          occurredTo: values.occurredTo || undefined,
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
        operations: undefined,
        occurredFrom: undefined,
        occurredTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: TableOperationsQueryRequest["filters"] = useMemo(
    () => ({
      author: search.author,
      operations: search.operations,
      occurredFrom: search.occurredFrom,
      occurredTo: search.occurredTo,
    }),
    [search.author, search.operations, search.occurredFrom, search.occurredTo]
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.author) n += 1
    n += search.operations?.length ?? 0
    if (search.occurredFrom || search.occurredTo) n += 1
    return n
  }, [search.author, search.operations, search.occurredFrom, search.occurredTo])

  return {
    filters: {
      author: search.author ?? "",
      operations: search.operations ?? [],
      occurredFrom: search.occurredFrom ?? "",
      occurredTo: search.occurredTo ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
