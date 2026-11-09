"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { columnasGestionables } from "@/features/gestion-estudiantil/inclusion/utils/columnas-gestionables"

interface Props<T> {
  /** Clave para recordar las columnas visibles. */
  id: string
  columns: ColumnDef<T>[]
  rows: T[]
  rowId: (fila: T) => string
  emptyMessage: string
  growColumnId?: string
  /** Tablas anchas: deja elegir las columnas visibles. */
  gestorColumnas?: boolean
}

/** `DataTable` del proyecto para listas cortas embebidas en una sección, sin paginar. */
export function TablaDatos<T>({ id, columns, rows, rowId, emptyMessage, growColumnId, gestorColumnas }: Props<T>) {
  const { table } = useDataTable({
    columns: columnasGestionables(columns.map((c) => ({ enableSorting: false, ...c }))),
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
  return (
    <div className="flex flex-col gap-3">
      <DataTable table={table} isPending={false} isError={false} onRetry={() => {}} emptyMessage={emptyMessage} growColumnId={growColumnId} />
      {gestorColumnas && <div className="flex justify-end"><DataTableViewOptions table={table} /></div>}
    </div>
  )
}
