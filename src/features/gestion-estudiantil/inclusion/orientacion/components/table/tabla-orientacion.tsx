"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

interface Props<T> {
  titulo: string
  columns: ColumnDef<T>[]
  rows: T[]
  rowId: (r: T) => string
  pageIndex: number
  pageSize: number
  pageCount: number
  totalCount: number
  goToPage: (n: number) => void
  setPageSize: (n: number) => void
  isPending: boolean
  isError: boolean
  onRetry: () => void
  errorMessage?: string
  emptyMessage: string
}

/** Una de las dos tablas de la pestaña (ORI.LIS.1); cada una pagina por su cuenta. */
export function TablaOrientacion<T>(p: Props<T>) {
  const { table } = useDataTable({
    columns: p.columns,
    data: p.rows,
    pageCount: p.pageCount,
    getRowId: p.rowId,
    pageIndex: p.pageIndex,
    pageSize: p.pageSize,
    goToPage: p.goToPage,
    setPageSize: p.setPageSize,
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: `orientacion-${p.titulo}-column-visibility`,
  })
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">{p.titulo}</h2>
      <DataTable table={table} isPending={p.isPending} isError={p.isError} onRetry={p.onRetry} errorMessage={p.errorMessage} emptyMessage={p.emptyMessage} growColumnId="estudiante" />
      {p.totalCount > p.pageSize && (
        <Pagination
          pageIndex={p.pageIndex}
          pageCount={p.pageCount}
          canPrev={p.pageIndex > 0}
          canNext={p.pageIndex < p.pageCount - 1}
          onPageChange={p.goToPage}
          totalCount={p.totalCount}
          pageSize={p.pageSize}
          onPageSizeChange={p.setPageSize}
        />
      )}
    </section>
  )
}
