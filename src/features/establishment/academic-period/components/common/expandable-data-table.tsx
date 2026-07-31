"use no memo"

import type { ReactNode } from "react"
import { Fragment } from "react"
import { flexRender, type Row, type Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ExpandableDataTableProps {
  table: Table<any>
  isPending: boolean
  isError: boolean
  onRetry: () => void
  emptyMessage?: string
  errorMessage?: string
  // Contenido expandible por fila. Si devuelve algo distinto de `null`/
  // `undefined`, se pinta como una fila extra a todo el ancho debajo de la
  // fila. Vive acá (en `features/`) y no en el `DataTable` compartido para no
  // tocar `src/components`; el `DataTable` de `components/` no soporta sub-filas.
  renderSubRow?: (row: Row<any>) => ReactNode
}

/**
 * Variante local del `DataTable` compartido que añade filas expandibles. Se
 * usa en las tabs que despliegan detalle por fila (escalas de valoración,
 * asignaciones académicas). Replica el mismo layout/estado (skeleton, error,
 * vacío) que `@/components/data-table` para verse idéntico.
 */
export function ExpandableDataTable({
  table,
  isPending,
  isError,
  onRetry,
  emptyMessage = "Sin resultados.",
  errorMessage = "Ocurrió un error al cargar los datos.",
  renderSubRow,
}: ExpandableDataTableProps) {
  const visibleColumns = table.getAllColumns().filter((c) => c.getIsVisible())
  const skeletonRowCount = table.getState().pagination.pageSize

  return (
    <div className="overflow-x-auto rounded-md border w-full border-border">
      <UITable className="w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted-22 hover:bg-muted-22">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                {errorMessage}{" "}
                <Button variant="link" onClick={onRetry}>
                  Reintentar
                </Button>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const subRow = renderSubRow?.(row)
              return (
                <Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {subRow != null && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={visibleColumns.length}
                        className="whitespace-normal bg-muted/20 p-4"
                      >
                        {subRow}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UITable>
    </div>
  )
}
