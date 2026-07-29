import { useCallback } from "react"
import type { SortingState } from "@tanstack/react-table"
import { useNavigate, useSearch } from "@tanstack/react-router"

import type { DataTableFilters } from "@/hooks/use-data-table"

export function useTablePagination(): DataTableFilters {
  const search = useSearch({ strict: false }) as {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDir?: "asc" | "desc"
  }
  const navigate = useNavigate() as unknown as (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>
    replace?: boolean
  }) => void

  const sorting: SortingState = search.sortBy
    ? [{ id: search.sortBy, desc: search.sortDir === "desc" }]
    : []

  const goToPage = useCallback(
    (nextPageIndex: number) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          page: nextPageIndex,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          pageSize: nextPageSize,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const setSorting = useCallback(
    (next: { id: string; desc: boolean }[]) => {
      const [first] = next
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sortBy: first?.id,
          sortDir: first ? (first.desc ? "desc" : "asc") : undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  return {
    pageIndex: search.page ?? 0,
    pageSize: search.pageSize ?? 10,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  }
}
