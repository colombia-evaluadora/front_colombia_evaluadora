import type { ColumnDef } from "@tanstack/react-table"
import { PencilIcon, TrashIcon } from "@phosphor-icons/react"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"

import { ESTABLISHMENT_STATUS_BADGE, ESTABLISHMENT_STATUS_LABELS } from "../../api/establishment-Ui-mappings"
import type { Establishment } from "../../api/types/establishment"

export const columns: ColumnDef<Establishment>[] = [
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
    accessorKey: "dane",
    id: "dane",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="DANE" />
    ),
  },
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Establecimiento" />
    ),
  },
  {
    accessorFn: (row) => `${row.department}/${row.municipality}`,
    id: "departmentMunicipality",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Departamento/Municipio"
      />
    ),
    cell: ({ row }) => (
      <div className="max-w-lg truncate">
        {row.original.department}/{row.original.municipality}
      </div>
    ),
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue<Establishment["status"]>("status")
      return (
        <Badge {...ESTABLISHMENT_STATUS_BADGE[status]}>
          {ESTABLISHMENT_STATUS_LABELS[status]}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="fill"
          color="secondary"
          size="icon"
          className="size-8"
          aria-label={`Editar ${row.original.name}`}
        >
          <PencilIcon />
        </Button>
        <Button
          type="button"
          variant="fill"
          color="destructive"
          size="icon"
          className="size-8"
          aria-label={`Eliminar ${row.original.name}`}
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
