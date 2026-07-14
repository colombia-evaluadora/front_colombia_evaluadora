import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

export interface UsePaginationResult {
  pageIndex: number
  pageSize: number
  goToPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  sorting: SortingState
  setSorting: (sorting: SortingState) => void
}

export function usePagination(initialPageSize = 10): UsePaginationResult {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [sorting, setSorting] = useState<SortingState>([])

  const setPageSize = (size: number) => {
    setPageSizeState(size)
    setPageIndex(0)
  }

  return {
    pageIndex,
    pageSize,
    goToPage: setPageIndex,
    setPageSize,
    sorting,
    setSorting,
  }
}
