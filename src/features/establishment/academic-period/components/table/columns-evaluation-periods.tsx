import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { EVALUATION_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type { EvaluationPeriod, EvaluationPeriodStatus } from "@/features/establishment/academic-period/api/types/evaluation-period"
import { DeleteEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-evaluation-period"
import { CreateEvaluationPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-evaluation-period"

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
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
      id: "codigo",
      accessorKey: "codigo",
      meta: { label: "Código" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-medium">{row.original.codigo}</span>,
    },
    {
      id: "nombre",
      accessorKey: "nombre",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <span className="font-semibold uppercase">{row.original.nombre}</span>,
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
      cell: ({ row }) => <span>{formatDate(row.original.startDate)}</span>,
    },
    {
      id: "endDate",
      accessorKey: "endDate",
      meta: { label: "Fecha fin" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha fin" />,
      cell: ({ row }) => <span>{formatDate(row.original.endDate)}</span>,
    },
    {
      id: "peso",
      accessorKey: "peso",
      meta: { label: "Peso porcentual" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Peso porcentual" />,
      cell: ({ row }) => <span>{row.original.peso}%</span>,
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const estado = row.getValue<EvaluationPeriodStatus>("estado")
        // El badge se indexa por `estado` (el código VALOR de TLISTA_VALOR,
        // "1"/"2"/"3"/"4"), pero el texto visible tiene que ser el NOMBRE
        // resuelto por el backend (`estadoName`) — mostrar el código crudo
        // era el mismo bug que ya se encontró en Tipo de escalas de
        // valoración (ver memoria del proyecto), solo que acá nunca se
        // había mostrado nada más que el código desde que se escribió esta
        // columna.
        const estadoLabel = row.original.estadoName ?? estado
        return (
          // "Habilitados para algunas asignaturas" no entra en una línea. El
          // `min-w` del contenedor le reserva ancho a la columna —si no, el
          // reparto automático de la tabla la estrangula y el texto se parte en
          // cuatro— y el `max-w` del badge lo deja envolver en dos líneas
          // ("Habilitados para" / "algunas asignaturas"), sin recortes.
          <div className="min-w-56">
            <Badge
              {...EVALUATION_PERIOD_STATUS_BADGE[estado]}
              className="max-w-64 text-left whitespace-normal"
            >
              {estadoLabel}
            </Badge>
          </div>
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
