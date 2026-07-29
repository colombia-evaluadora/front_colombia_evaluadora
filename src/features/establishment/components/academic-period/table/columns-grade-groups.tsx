import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { GradeGroup } from "../../../api/types/academic-period/grade-group"
import { DeleteGradeGroupDialog } from "../dialogs/dialog-delete-grade-group"
import { CreateGradeGroupDialog } from "../dialogs/dialog-create-grade-group"

interface CreateGradeGroupColumnsOptions {
  academicPeriodId?: number
}

export function createGradeGroupColumns({
  academicPeriodId,
}: CreateGradeGroupColumnsOptions = {}): ColumnDef<GradeGroup>[] {
  return [
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
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <CreateGradeGroupDialog
          gradeGroup={row.original}
          academicPeriodId={academicPeriodId}
        />
        <DeleteGradeGroupDialog gradeGroup={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
    },
  ]
}

export type GradeGroupTable = Table<GradeGroup>
