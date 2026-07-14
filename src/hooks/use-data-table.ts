import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table"

interface UseDataTableParams<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  pageCount: number
  getRowId: (row: TData) => string
  pageIndex: number
  pageSize: number
  goToPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  sorting: SortingState
  setSorting: (sorting: SortingState) => void
}

export function useDataTable<TData>({
  columns,
  data,
  pageCount,
  getRowId,
  pageIndex,
  pageSize,
  goToPage,
  setPageSize,
  sorting,
  setSorting,
}: UseDataTableParams<TData>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    pageCount,
    getRowId,
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
      rowSelection,
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize)
      } else {
        goToPage(next.pageIndex)
      }
    },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      setSorting(next)
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const hasSelection = selectedIds.length > 0
  const resetSelection = () => setRowSelection({})

  return { table, selectedIds, hasSelection, resetSelection }
}
