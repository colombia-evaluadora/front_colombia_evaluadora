"use no memo"

import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"

import { DataTable } from "@/components/data-table"
import { useDataTable } from "@/hooks/use-data-table"

const SIN_ACCION = () => undefined
const SIN_ORDEN: never[] = []

interface Props<T> {
  columns: ColumnDef<T>[]
  data: T[]
  getRowId: (row: T) => string
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
  errorMessage?: string
  emptyMessage?: ReactNode
  growColumnId?: string
}

/** Tabla sin paginar ni orden (los indicadores llegan completos): la misma DataTable de los listados. */
export function TablaSimple<T>({
  columns,
  data,
  getRowId,
  isPending = false,
  isError = false,
  onRetry = SIN_ACCION,
  errorMessage,
  emptyMessage,
  growColumnId,
}: Props<T>) {
  const { table } = useDataTable({
    columns,
    data,
    pageCount: 1,
    getRowId,
    pageIndex: 0,
    pageSize: Math.max(data.length, 1),
    goToPage: SIN_ACCION,
    setPageSize: SIN_ACCION,
    sorting: SIN_ORDEN,
    setSorting: SIN_ACCION,
  })
  return (
    <DataTable
      table={table}
      isPending={isPending}
      isError={isError}
      onRetry={onRetry}
      emptyMessage={emptyMessage}
      errorMessage={errorMessage}
      growColumnId={growColumnId}
    />
  )
}
