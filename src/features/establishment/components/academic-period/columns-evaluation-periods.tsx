import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { EVALUATION_PERIOD_STATUS_BADGE } from "../../api/ui-mappings"
import type {
  EvaluationPeriod,
  EvaluationPeriodStatus,
} from "../../api/types/academic-period/evaluation-period"

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export const columns: ColumnDef<EvaluationPeriod>[] = [
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
        aria-label={`Seleccionar ${row.original.nombre}`}
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Código" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.codigo}</span>
    ),
  },
  {
    id: "nombre",
    accessorKey: "nombre",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.nombre}</span>
    ),
  },
  {
    id: "abreviacion",
    accessorKey: "abreviacion",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Abreviación" />
    ),
    cell: ({ row }) => <span>{row.original.abreviacion}</span>,
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
      <DataTableColumnHeader column={column} title="Fecha fin" />
    ),
    cell: ({ row }) => <span>{formatDate(row.original.endDate)}</span>,
  },
  {
    id: "peso",
    accessorKey: "peso",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Peso porcentual" />
    ),
    cell: ({ row }) => <span>{row.original.peso}%</span>,
  },
  {
    id: "estado",
    accessorKey: "estado",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Estado" />
    ),
    cell: ({ row }) => {
      const estado = row.getValue<EvaluationPeriodStatus>("estado")
      return (
        <Badge {...EVALUATION_PERIOD_STATUS_BADGE[estado]}>{estado}</Badge>
      )
    },
  },
]

export type EvaluationPeriodTable = Table<EvaluationPeriod>
