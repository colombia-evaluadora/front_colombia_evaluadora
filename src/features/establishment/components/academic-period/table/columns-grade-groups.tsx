import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { GradeGroup } from "../../../api/types/academic-period/grade-group"

export const columns: ColumnDef<GradeGroup>[] = [
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
        aria-label={`Seleccionar ${row.original.codigo}`}
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
    id: "codigo",
    accessorKey: "codigo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Grupo" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.codigo}</span>
    ),
  },
  {
    id: "jornada",
    accessorKey: "jornada",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Jornada" />
    ),
    cell: ({ row }) => <span>{row.original.jornada}</span>,
  },
  {
    id: "director",
    accessorKey: "director",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Director de grupo" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.director || "—"}</span>
    ),
  },
  {
    id: "planEstudio",
    accessorKey: "planEstudio",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Plan de estudio" />
    ),
    cell: ({ row }) => <span>{row.original.planEstudio}</span>,
  },
]

export type GradeGroupTable = Table<GradeGroup>
