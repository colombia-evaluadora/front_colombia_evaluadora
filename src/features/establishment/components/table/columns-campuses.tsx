import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PencilIcon, TrashIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"

import type { Campus } from "../../api/types/campus"

export const columns: ColumnDef<Campus>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre de la sede" />
    ),
  },
  {
    accessorKey: "dane",
    id: "dane",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Dane" />
    ),
  },
  {
    accessorKey: "zone",
    id: "zone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Zona" />
    ),
    cell: ({ row }) => (
      <Badge variant="fill" color="muted">
        {row.original.zone.name}
      </Badge>
    ),
  },
  {
    accessorKey: "address",
    id: "address",
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Teléfono" />
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: () => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="fill"
          color="secondary"
          size="icon"
          className="size-8"
          aria-label="Editar sede"
        >
          <PencilIcon />
        </Button>
        <Button
          type="button"
          variant="fill"
          color="destructive"
          size="icon"
          className="size-8"
          aria-label="Eliminar sede"
        >
          <TrashIcon />
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]