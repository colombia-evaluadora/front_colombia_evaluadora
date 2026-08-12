import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type { AreaSubject } from "../../../api/types/area-subject"
import { DeleteAreaSubjectDialog } from "../dialogs/dialog-delete-area-subject"
import { EditAreaSubjectDialog } from "../dialogs/dialog-edit-area-subject"

export const columns: ColumnDef<AreaSubject>[] = [
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
        aria-label={`Seleccionar ${row.original.nombreInterno}`}
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
    id: "numero",
    meta: { label: "N°" },
    header: () => <span className="text-muted-foreground">#</span>,
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    id: "nombreInterno",
    accessorKey: "nombreInterno",
    meta: { label: "Nombre del área" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre del área" />,
    cell: ({ row }) => <span className="font-medium">{row.original.nombreInterno}</span>,
  },
  {
    id: "abreviacion",
    accessorKey: "abreviacion",
    meta: { label: "Abreviación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Abreviación" />,
    cell: ({ row }) => <span className="font-semibold">{row.original.abreviacion}</span>,
  },
  {
    id: "ordenReportes",
    accessorKey: "ordenReportes",
    meta: { label: "Orden de reporte" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Orden de reporte" />,
    cell: ({ row }) => <span>{row.original.ordenReportes}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <EditAreaSubjectDialog areaSubject={row.original} />
        <DeleteAreaSubjectDialog areaSubject={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]

export type AreaSubjectTable = Table<AreaSubject>
