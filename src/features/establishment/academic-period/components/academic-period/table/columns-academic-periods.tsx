import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import {
  ACADEMIC_PERIOD_STATUS_BADGE,
  ACADEMIC_PERIOD_STATUS_LABELS,
} from "../../../api/ui-mappings"
import type {
  AcademicPeriod,
  AcademicPeriodStatus,
} from "../../../api/types/academic-period"
import { DeleteAcademicPeriodDialog } from "../dialogs/dialog-delete-academic-period"
import { EditAcademicPeriodButton } from "./edit-academic-period-button"

// Las fechas llegan como "yyyy-MM-dd" (date-only). Parsearlas con
// `new Date(...)` las interpreta como UTC medianoche y `toLocaleDateString`
// puede correr un día según la zona horaria, así que las formateamos a
// mano a "dd/MM/yyyy".
function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export const columns: ColumnDef<AcademicPeriod>[] = [
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
        aria-label={`Seleccionar periodo ${row.original.name}`}
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
    id: "schoolYearId",
    accessorKey: "schoolYearId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Año lectivo" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.schoolYearId}</span>
    ),
  },
  {
    id: "sedeName",
    accessorKey: "sedeName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sede" />
    ),
    cell: ({ row }) => (
      <span className="truncate">{row.original.sedeName}</span>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const status = row.getValue<AcademicPeriodStatus>("status")
      return (
        <Badge {...ACADEMIC_PERIOD_STATUS_BADGE[status]}>
          {ACADEMIC_PERIOD_STATUS_LABELS[status]}
        </Badge>
      )
    },
  },
  {
    id: "startDate",
    accessorKey: "startDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha inicio" />
    ),
    cell: ({ row }) => <span>{formatDate(row.original.startDate)}</span>,
  },
  {
    id: "endDate",
    accessorKey: "endDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha finalización" />
    ),
    cell: ({ row }) => <span>{formatDate(row.original.endDate)}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <EditAcademicPeriodButton period={row.original} />
        <DeleteAcademicPeriodDialog period={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]

export type AcademicPeriodTable = Table<AcademicPeriod>
