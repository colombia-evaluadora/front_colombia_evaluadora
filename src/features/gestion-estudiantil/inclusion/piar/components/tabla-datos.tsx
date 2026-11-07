"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { useDataTable } from "@/hooks/use-data-table"

interface Props<T> {
  /** Clave para recordar las columnas visibles. */
  id: string
  columns: ColumnDef<T>[]
  rows: T[]
  rowId: (fila: T) => string
  emptyMessage: string
  growColumnId?: string
}

/** `DataTable` del proyecto para listas cortas embebidas en una sección, sin paginar. */
export function TablaDatos<T>({ id, columns, rows, rowId, emptyMessage, growColumnId }: Props<T>) {
  const { table } = useDataTable({
    columns: columns.map((c) => ({ enableSorting: false, ...c })),
    data: rows,
    pageCount: 1,
    getRowId: rowId,
    pageIndex: 0,
    pageSize: Math.max(rows.length, 1),
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: `${id}-column-visibility`,
  })
  return <DataTable table={table} isPending={false} isError={false} onRetry={() => {}} emptyMessage={emptyMessage} growColumnId={growColumnId} />
}
