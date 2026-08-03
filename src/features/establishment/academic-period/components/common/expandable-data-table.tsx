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
import { cn } from "@/lib/utils"

interface ExpandableDataTableProps {
  table: Table<any>
  isPending: boolean
  isError: boolean
  onRetry: () => void
  emptyMessage?: string
  errorMessage?: string
  renderSubRow?: (row: Row<any>) => ReactNode
  cellClassName?: string
  // Id de la columna que absorbe el espacio sobrante (width: 100%). Sirve para
  // empaquetar a la izquierda las columnas angostas (expandir, seleccionar) en
  // tablas con pocas columnas, donde el ancho `w-full` se reparte y agranda la
  // separación entre celdas.
  growColumnId?: string
  // Clases extra para la columna `growColumnId` (encabezado y celda). Se aplican
  // a nivel de th/td, no al contenido, para no romper la alineación del texto.
  growColumnClassName?: string
}

export function ExpandableDataTable({
  table,
  isPending,
  isError,
  onRetry,
  emptyMessage = "Sin resultados.",
  errorMessage = "Ocurrió un error al cargar los datos.",
  renderSubRow,
  cellClassName,
  growColumnId,
  growColumnClassName,
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
                <TableHead
                  key={header.id}
                  className={cn(
                    "text-foreground",
                    cellClassName,
                    header.column.id === growColumnId && growColumnClassName
                  )}
                  style={
                    header.column.id === growColumnId
                      ? { width: "100%" }
                      : undefined
                  }
                >
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
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cellClassName,
                          cell.column.id === growColumnId && growColumnClassName
                        )}
                        style={
                          cell.column.id === growColumnId
                            ? { width: "100%" }
                            : undefined
                        }
                      >
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
