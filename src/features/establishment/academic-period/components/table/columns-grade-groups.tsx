import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import { DeleteGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-grade-group"
import { CreateGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-grade-group"

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
          aria-label="Seleccionar página"
          className="translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
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
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
    },
    {
      id: "jornada",
      accessorKey: "jornada",
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      cell: ({ row }) => <span>{row.original.jornada}</span>,
    },
    {
      id: "director",
      accessorKey: "director",
      meta: { label: "Director de grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Director de grupo" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.director || "—"}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <CreateGradeGroupDialog gradeGroup={row.original} academicPeriodId={academicPeriodId} />
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
