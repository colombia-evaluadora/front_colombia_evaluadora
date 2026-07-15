import { useCallback, useState } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import type { SortingState } from "@tanstack/react-table"

import type { DataTableFilters } from "./use-data-table"

const DEFAULT_PAGE_SIZE = 10

export function usePagination(): DataTableFilters {
  const { pageIndex: rawPageIndex, pageSize: rawPageSize } = useSearch({
    from: "/app/",
    select: (search) => ({
      pageIndex: search.pageIndex,
      pageSize: search.pageSize,
    }),
  })
  const navigate = useNavigate({ from: "/app" })

  const pageIndex = rawPageIndex ?? 0
  const pageSize = rawPageSize ?? DEFAULT_PAGE_SIZE

  const [sorting, setSortingState] = useState<SortingState>([])

  const goToPage = useCallback(
    (nextPageIndex: number) => {
      navigate({
        to: "/app",
        search: (prev) => ({
          ...prev,
          pageIndex: nextPageIndex > 0 ? nextPageIndex : undefined,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      navigate({
        to: "/app",
        search: (prev) => ({
          ...prev,
          pageSize: nextPageSize !== DEFAULT_PAGE_SIZE ? nextPageSize : undefined,
          pageIndex: undefined,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const setSorting = useCallback(
    (next: SortingState) => {
      setSortingState(next)
      navigate({
        to: "/app",
        search: (prev) => ({ ...prev, pageIndex: undefined }),
        replace: true,
      })
    },
    [navigate]
  )

  return { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting }
}
