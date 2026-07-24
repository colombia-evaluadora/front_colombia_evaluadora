import type { ColumnDef, Table } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import type {
  AreaSubject,
} from "../../../api/types/academic-period/area-subject"
import { DeleteAreaSubjectDialog } from "../dialogs/dialog-delete-area-subject"
import { EditAreaSubjectButton } from "./edit-area-subject-button"

export const columns: ColumnDef<AreaSubject>[] = [
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
    id: "codigo",
    accessorKey: "Nombre de area",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre de area" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nombreInterno}</span>
    ),
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Abreviacion" />
    ),
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.abreviacion}</span>
    ),
  },
  {
    id: "abreviacion",
    accessorKey: "abreviacion",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Orden de reporte" />
    ),
    cell: ({ row }) => <span>{row.original.ordenReportes}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <EditAreaSubjectButton areaSubject={row.original} />
        <DeleteAreaSubjectDialog areaSubject={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]

export type AreaSubjectTable = Table<AreaSubject>
