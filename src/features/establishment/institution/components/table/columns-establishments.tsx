import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { paths } from "@/config/paths"

import { ESTABLISHMENT_STATUS_BADGE, ESTABLISHMENT_STATUS_LABELS } from "@/features/establishment/institution/api/ui-mappings"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { DeleteEstablishmentDialog } from "@/features/establishment/institution/components/dialogs/dialog-delete"

export const columns: ColumnDef<Establishment>[] = [
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
    accessorKey: "dane",
    id: "dane",
    meta: { label: "DANE" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="DANE" />
    ),
  },
  {
    accessorKey: "name",
    id: "name",
    meta: { label: "Establecimiento" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Establecimiento" />
    ),
    cell: ({ row }) => (
      <p className="uppercase font-bold">{row.getValue("name")}</p>
    ),
  },
  {
    accessorFn: (row) => `${row.department}/${row.municipality}`,
    id: "departmentMunicipality",
    meta: { label: "Departamento/Municipio" },
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
    meta: { label: "Estado" },
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
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Editar ${row.original.name}`}
          render={<Link to={paths.app.establishments.edit.getHref(row.original.id)} />}
          nativeButton={false}
        >
          <PencilIcon />
        </Button>
        <DeleteEstablishmentDialog establishment={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]
