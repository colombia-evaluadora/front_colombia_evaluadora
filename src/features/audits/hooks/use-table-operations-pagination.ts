import { useCallback } from "react"
import type { SortingState } from "@tanstack/react-table"

import type { DataTableFilters } from "@/hooks/use-data-table"
import { auditoriaTablaDetalleRoute } from "@/router"

export function useTableOperationsPagination(): DataTableFilters {
  const search = auditoriaTablaDetalleRoute.useSearch()
  const navigate = auditoriaTablaDetalleRoute.useNavigate()

  const sorting: SortingState = search.sortBy
    ? [{ id: search.sortBy, desc: search.sortDir === "desc" }]
    : []

  const goToPage = useCallback(
    (nextPageIndex: number) => {
      navigate({
        search: (prev) => ({ ...prev, page: nextPageIndex }),
        replace: true,
      })
    },
    [navigate]
  )

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      navigate({
        search: (prev) => ({ ...prev, pageSize: nextPageSize, page: 0 }),
        replace: true,
      })
    },
    [navigate]
  )

  const setSorting = useCallback(
    (next: SortingState) => {
      const [first] = next
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: first?.id,
          sortDir: first ? (first.desc ? "desc" : "asc") : undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  return {
    pageIndex: search.page,
    pageSize: search.pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  }
}
