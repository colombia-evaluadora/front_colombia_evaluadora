"use no memo"

import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type Table,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table"

export interface DataTableFilters {
  pageIndex: number
  pageSize: number
  goToPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  sorting: SortingState
  setSorting: (next: SortingState) => void
}

interface UseDataTableOptions<TData> extends DataTableFilters {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  pageCount: number
  getRowId: (row: TData) => string
  // Si se define, la visibilidad de columnas se persiste en localStorage
  // bajo esta clave, para recordarla entre sesiones.
  columnVisibilityStorageKey?: string
}

function readStoredVisibility(storageKey: string | undefined): VisibilityState {
  if (!storageKey) return {}
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

interface UseDataTableResult<TData> {
  table: Table<TData>
  selectedIds: string[]
  hasSelection: boolean
  resetSelection: () => void
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
  columnVisibilityStorageKey,
}: UseDataTableOptions<TData>): UseDataTableResult<TData> {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    readStoredVisibility(columnVisibilityStorageKey),
  )
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const onColumnVisibilityChange = (updater: Updater<VisibilityState>) => {
    setColumnVisibility((current) => {
      const next = typeof updater === "function" ? updater(current) : updater
      if (columnVisibilityStorageKey) {
        try {
          localStorage.setItem(columnVisibilityStorageKey, JSON.stringify(next))
        } catch {
          // localStorage no disponible (modo privado, cuota, etc.): se ignora.
        }
      }
      return next
    })
  }

  const onSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater
    setSorting(next)
  }

  const onPaginationChange = (updater: Updater<{ pageIndex: number; pageSize: number }>) => {
    const current = { pageIndex, pageSize }
    const next = typeof updater === "function" ? updater(current) : updater
    if (next.pageIndex !== current.pageIndex) goToPage(next.pageIndex)
    if (next.pageSize !== current.pageSize) setPageSize(next.pageSize)
  }

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange,
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row),
    enableRowSelection: true,
  })

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id] === true),
    [rowSelection],
  )

  return {
    table,
    selectedIds,
    hasSelection: selectedIds.length > 0,
    resetSelection: () => setRowSelection({}),
  }
}
