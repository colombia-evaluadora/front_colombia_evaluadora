import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import {
  EDUCATION_LEVEL_LABELS,
  RESERVATION_STATUS_BADGE,
  RESERVATION_STATUS_LABELS,
  SHIFT_LABELS,
  formatGrade,
} from "../../api/ui-mappings"
import type { Reservation, ReservationStatus } from "../../api/types/reservation"

export const columns: ColumnDef<Reservation>[] = [
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
        aria-label={`Seleccionar reserva de ${row.original.firstName} ${row.original.lastName}`}
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
    id: "institution",
    accessorKey: "institution",
    meta: { label: "Institución" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Institución" />,
    cell: ({ row }) => <span className="truncate">{row.original.institution}</span>,
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
    cell: ({ row }) => <span className="tabular-nums">{row.original.group}</span>,
  },
  {
    id: "shift",
    accessorKey: "shift",
    meta: { label: "Jornada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => (
      <Badge variant="soft" color="secondary">
        {SHIFT_LABELS[row.original.shift]}
      </Badge>
    ),
  },
  {
    id: "educationLevel",
    accessorKey: "educationLevel",
    meta: { label: "Nivel educativo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel educativo" />,
    cell: ({ row }) => <span>{EDUCATION_LEVEL_LABELS[row.original.educationLevel]}</span>,
  },
  {
    id: "reservedAt",
    accessorKey: "reservedAt",
    meta: { label: "Fecha de reserva" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de reserva" />,
    cell: ({ row }) => {
      const reservedAt = new Date(row.original.reservedAt)
      return (
        <div className="flex flex-col">
          <span className="font-medium">{reservedAt.toLocaleDateString("en-CA")}</span>
          <span className="text-xs text-muted-foreground">
            {reservedAt.toLocaleTimeString(undefined, { hour12: false })}
          </span>
        </div>
      )
    },
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue<ReservationStatus>("status")
      return (
        <Badge {...RESERVATION_STATUS_BADGE[status]}>{RESERVATION_STATUS_LABELS[status]}</Badge>
      )
    },
  },
]

export type ReservationsTable = Table<Reservation>
