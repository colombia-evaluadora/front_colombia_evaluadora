"use no memo"

import type { ColumnDef, SortingState } from "@tanstack/react-table"

import { useDataTable } from "@/hooks/use-data-table"

const SIN_ORDEN: SortingState = []
const nada = () => {}

/**
 * Tabla de una pestaña del caso: todas las filas llegan juntas (sin paginar ni ordenar), y el orden es el del
 * backend. Existe para que la pestaña use `DataTable` y sus acciones salgan como iconos en el hover de la fila.
 */
export function useTablaLocal<T>(opciones: {
  columns: ColumnDef<T, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  data: T[]
  getRowId: (fila: T) => string
  storageKey: string
}) {
  return useDataTable({
    columns: opciones.columns,
    data: opciones.data,
    pageCount: 1,
    getRowId: opciones.getRowId,
    pageIndex: 0,
    pageSize: Math.max(opciones.data.length, 1),
    goToPage: nada,
    setPageSize: nada,
    sorting: SIN_ORDEN,
    setSorting: nada,
    columnVisibilityStorageKey: opciones.storageKey,
  }).table
}
