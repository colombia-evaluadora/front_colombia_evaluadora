import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import { DeleteCampusDialog } from "@/features/establishment/campuses/components/dialogs/dialog-delete"

interface CampusColumnsOptions {
  onEdit: (campusId: string) => void
}

export function createColumns({ onEdit }: CampusColumnsOptions): ColumnDef<Campus>[] {
  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
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
        aria-label={`Seleccionar ${row.original.name}`}
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
    accessorKey: "name",
    id: "name",
    meta: { label: "Nombre de la sede" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre de la sede" />
    ),
    cell: ({ row }) => (
      <p className="uppercase font-bold">{row.getValue("name")}</p>
    ),
  },
  {
    accessorKey: "dane",
    id: "dane",
    meta: { label: "Dane" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dane" />
    ),
  },
  {
    accessorKey: "zone",
    id: "zone",
    meta: { label: "Zona" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Zona" />
    ),
    cell: ({ row }) => <p>{row.original.zone.name}</p>,
  },
  {
    accessorKey: "address",
    id: "address",
    meta: { label: "Dirección" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dirección" />
    ),
    cell: ({ row }) => (
      <div className="max-w-lg truncate">{row.original.address}</div>
    ),
  },
  {
    accessorKey: "phone",
    id: "phone",
    meta: { label: "Teléfono" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Teléfono" />
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label="Editar sede"
          onClick={() => onEdit(row.original.id)}
        >
          <PencilIcon />
        </Button>
        <DeleteCampusDialog campus={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
  ]
}