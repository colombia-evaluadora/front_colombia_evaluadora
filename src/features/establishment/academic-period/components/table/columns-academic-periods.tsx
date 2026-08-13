import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { ACADEMIC_PERIOD_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type { AcademicPeriod, AcademicPeriodStatus } from "@/features/establishment/academic-period/api/types/academic-period"
import { useAcademicPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-academic-period-statuses"
import { DeleteAcademicPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-academic-period"
import { EditAcademicPeriodButton } from "@/features/establishment/academic-period/components/edit-academic-period-button"

function StatusCell({ status }: { status: AcademicPeriodStatus }) {
  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()
  const label = statusOptions.find((o) => o.key === status)?.label ?? status
  return <Badge {...ACADEMIC_PERIOD_STATUS_BADGE[status]}>{label}</Badge>
}

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
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
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
    meta: { label: "Año lectivo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año lectivo" />,
    cell: ({ row }) => <span className="font-medium">{row.original.schoolYearId}</span>,
  },
  {
    id: "sedeName",
    accessorKey: "sedeName",
    meta: { label: "Sede" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    cell: ({ row }) => (
      <span className="truncate font-bold uppercase">{row.original.sedeName}</span>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <StatusCell status={row.getValue<AcademicPeriodStatus>("status")} />,
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
    meta: { label: "Fecha finalización" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha finalización" />,
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
