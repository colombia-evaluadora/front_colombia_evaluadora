import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { Grade } from "../../../api/types/academic-period/grade"

export const columns: ColumnDef<Grade>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        color="neutral"
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={
          !table.getIsAllPageRowsSelected() &&
          table.getIsSomePageRowsSelected()
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        color="neutral"
        aria-label={`Seleccionar ${row.original.nombre}`}
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre del grado" />
    ),
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.nombre}</span>
    ),
  },
  {
    id: "grado",
    accessorKey: "grado",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Grado" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.original.grado}</span>,
  },
  {
    id: "teachingLevelName",
    accessorKey: "teachingLevelName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nivel de enseñanza" />
    ),
    cell: ({ row }) => (
      <Badge variant="fill" color="muted">
        {row.original.teachingLevelName}
      </Badge>
    ),
  },
]

export type GradeTable = Table<Grade>
