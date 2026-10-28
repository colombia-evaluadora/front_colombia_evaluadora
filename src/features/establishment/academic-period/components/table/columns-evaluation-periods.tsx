import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { EVALUATION_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type {
  EvaluationPeriod,
  EvaluationPeriodStatus,
} from "@/features/establishment/academic-period/api/types/evaluation-period"
import { DeleteEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-evaluation-period"
import { CreateEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-evaluation-period"

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

const PESO_FORMAT = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

/** "25,0 %": mismo formato en la tabla y en la suma de pesos. */
export function formatPeso(value: number): string {
  return `${PESO_FORMAT.format(value)} %`
}

interface CreateEvaluationPeriodColumnsOptions {
  academicPeriodId?: number
}

export function createEvaluationPeriodColumns({
  academicPeriodId,
}: CreateEvaluationPeriodColumnsOptions = {}): ColumnDef<EvaluationPeriod>[] {
  return [
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
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      id: "abreviacion",
      accessorKey: "abreviacion",
      meta: { label: "Abreviación" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Abreviación" />,
      cell: ({ row }) => <span>{row.original.abreviacion}</span>,
    },
    {
      id: "startDate",
      accessorKey: "startDate",
      meta: { label: "Fecha inicio" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha inicio" />,
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.startDate)}</span>,
    },
    {
      id: "endDate",
      accessorKey: "endDate",
      meta: { label: "Fecha fin" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha fin" />,
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.endDate)}</span>,
    },
    {
      id: "peso",
      accessorKey: "peso",
      meta: { label: "Peso" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Peso" />,
      cell: ({ row }) => <span className="tabular-nums">{formatPeso(row.original.peso)}</span>,
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const estado = row.getValue<EvaluationPeriodStatus>("estado")
        const estadoLabel = row.original.estadoName ?? estado
        return (
          <Badge {...EVALUATION_PERIOD_STATUS_BADGE[estado]}>
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {estadoLabel}
          </Badge>
        )
      },
      size: 200,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <CreateEvaluationPeriodDialog period={row.original} academicPeriodId={academicPeriodId} />
          <DeleteEvaluationPeriodDialog period={row.original} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}

export type EvaluationPeriodTable = Table<EvaluationPeriod>
