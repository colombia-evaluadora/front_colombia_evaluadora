import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/data-table"
import { Checkbox } from "@/components/ui/checkbox"
import { EyeIcon } from "@/components/ui/icons"

import { formatGrade } from "@/features/coverage/api/ui-mappings"
import {
  ENROLLMENT_STATUS_BADGE,
  ENROLLMENT_STATUS_LABELS,
} from "@/features/coverage/api/ui-mappings-enrollments"
import type { Enrollment } from "@/features/coverage/api/types/enrollment"
import { paths } from "@/config/paths"
import { useNavigate } from "@tanstack/react-router"

export const columnsEnrollments: ColumnDef<Enrollment>[] = [
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
        aria-label={`Seleccionar ${row.original.firstName} ${row.original.lastName}`}
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
    id: "documentNumber",
    accessorKey: "documentNumber",
    meta: { label: "ID" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
  },
  {
    id: "firstName",
    accessorKey: "firstName",
    meta: { label: "Nombres" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombres" />,
    cell: ({ row }) => <span className="font-medium">{row.original.firstName}</span>,
  },
  {
    id: "lastName",
    accessorKey: "lastName",
    meta: { label: "Apellidos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Apellidos" />,
    cell: ({ row }) => <span className="font-medium">{row.original.lastName}</span>,
  },
  {
    id: "campus",
    accessorKey: "campus",
    meta: { label: "Sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    cell: ({ row }) => <span>{row.original.campus}</span>,
  },
  {
    id: "grade",
    accessorKey: "grade",
    meta: { label: "Grado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    cell: ({ row }) => <span className="tabular-nums">{formatGrade(row.original.grade)}</span>,
  },
  {
    id: "group",
    accessorKey: "group",
    meta: { label: "Grupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    cell: ({ row }) => <span>{row.original.group}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge {...ENROLLMENT_STATUS_BADGE[status]}>{ENROLLMENT_STATUS_LABELS[status]}</Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => {
      return <ViewEnrollmentButton id={row.original.id} row={row.original} />
    },
    enableSorting: false,
    enableHiding: false,
    size: 64,
  },
]

function ViewEnrollmentButton({ id, row }: { id: string; row: Enrollment }) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        color="neutral"
        size="icon-sm"
        aria-label={`Ver detalle de ${row.firstName} ${row.lastName}`}
        onClick={() => {
          navigate({
            to: paths.app.coberturaInscritoDetalle.getHref(id),
          })
        }}
      >
        <EyeIcon />
      </Button>
    </div>
  )
}
