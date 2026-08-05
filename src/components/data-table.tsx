"use no memo"

import { flexRender, type Column, type RowData, type Table } from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretUpDownIcon,
  EyeSlashIcon,
  GearIcon,
} from "@/components/ui/icons"

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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // El `header` de cada columna es JSX, así que no sirve como etiqueta
  // legible fuera de la tabla (menú de columnas visibles, exports, etc.).
  // `meta.label` guarda ese texto en español una sola vez.
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
  }
}

interface DataTableProps {
  table: Table<any>
  isPending: boolean
  isError: boolean
  onRetry: () => void
  emptyMessage?: string
  errorMessage?: string
}

export function DataTable({
  table,
  isPending,
  isError,
  onRetry,
  emptyMessage = "Sin resultados.",
  errorMessage = "Ocurrió un error al cargar los datos.",
}: DataTableProps) {
  const visibleColumns = table.getAllColumns().filter((c) => c.getIsVisible())
  const skeletonRowCount = table.getState().pagination.pageSize

  // Los botones de fila son un overlay ABSOLUTO sobre la celda `actions`, no
  // contenido en flujo: así no empujan el layout y solo se revelan al hacer
  // hover (o foco) sobre la fila.
  //
  // La celda ancla ese overlay y va pegada al borde derecho del contenedor de
  // scroll (`sticky right-0`), para que los botones sigan alcanzables con la
  // tabla scrolleada en horizontal. La celda NO lleva fondo —así las columnas
  // que pasan por debajo se ven normal—; lo único opaco es el overlay.
  const isActionsColumn = (id: string) => id === "actions"
  const actionsCellClass = "sticky right-0 z-10"
  // `inset-y-0 right-0` y sin radio: el bloque va a sangre contra el borde de
  // la tabla, con el alto completo de la fila. El color es el del hover de
  // `TableRow` (`bg-muted/50`) ya resuelto sobre la card con `color-mix`: hace
  // falta opaco, y así no se lee como un bloque de otro color.
  const actionsOverlayClass = cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-3",
    "bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]",
    "opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100",
  )

  // Columna de respiro al final de la tabla: reserva el ancho que ocupa el
  // overlay para que este nunca quede encima de datos, y de paso deja margen
  // de scroll horizontal. Solo aplica si la tabla trae columna de acciones.
  const hasActionsColumn = visibleColumns.some((c) => isActionsColumn(c.id))
  const columnCount = visibleColumns.length + (hasActionsColumn ? 1 : 0)
  const spacer = hasActionsColumn ? <td aria-hidden className="w-24 p-0" /> : null

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
              {hasActionsColumn ? <th aria-hidden className="w-24 p-0" /> : null}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map((col, j) => (
                  <TableCell
                    key={j}
                    className={cn(isActionsColumn(col.id) && actionsCellClass)}
                  >
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
                {spacer}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {errorMessage}{" "}
                <Button variant="link" onClick={onRetry}>
                  Reintentar
                </Button>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="group/row"
              >
                {row.getVisibleCells().map((cell) => {
                  const isActions = isActionsColumn(cell.column.id)
                  return (
                    <TableCell key={cell.id} className={cn(isActions && actionsCellClass)}>
                      <div className={cn(isActions && actionsOverlayClass)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </TableCell>
                  )
                })}
                {spacer}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UITable>
    </div>
  )
}

interface DataTableViewOptionsProps {
  table: Table<any>
}

export function DataTableViewOptions({ table }: DataTableViewOptionsProps) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" color="muted" size="icon" aria-label="Columnas visibles" />
        }
      >
        <GearIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

/**
 * Rendered inside `columnDef.header` callbacks (e.g. `columns.tsx`), which
 * hand it a `column` directly — no `DataTable` context needed here, all
 * state (`getIsSorted`, `toggleSorting`, `getCanHide`, ...) lives on the
 * `Column` object itself.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn("text-sm font-medium", className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" color="neutral" className="data-[state=open]:bg-accent uppercase font-bold -ml-3 h-8" />
          }
        >
          <span>{title}</span>
          {sorted === "desc" ? (
            <ArrowDownIcon data-icon="inline-end" />
          ) : sorted === "asc" ? (
            <ArrowUpIcon data-icon="inline-end" />
          ) : (
            <CaretUpDownIcon data-icon="inline-end" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {column.getCanSort() && (
              <>
                <DropdownMenuCheckboxItem
                  closeOnClick
                  checked={sorted === "asc"}
                  onCheckedChange={() =>
                    sorted === "asc" ? column.clearSorting() : column.toggleSorting(false)
                  }
                >
                  <ArrowUpIcon data-icon="inline-start" />
                  Asc
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  closeOnClick
                  checked={sorted === "desc"}
                  onCheckedChange={() =>
                    sorted === "desc" ? column.clearSorting() : column.toggleSorting(true)
                  }
                >
                  <ArrowDownIcon data-icon="inline-start" />
                  Desc
                </DropdownMenuCheckboxItem>
              </>
            )}
            {column.getCanHide() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                  <EyeSlashIcon data-icon="inline-start" />
                  Ocultar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}