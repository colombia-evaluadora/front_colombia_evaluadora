import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { RESERVATION_STATUS_BADGE } from "@/features/establishment/academic-period/api/ui-mappings"
import type {
  AcademicPeriod,
  AcademicPeriodStatus,
} from "@/features/establishment/academic-period/api/types/academic-period"
import { useAcademicPeriodStatusesQuery } from "@/features/establishment/academic-period/api/query/use-academic-period-statuses"
import { DeleteAcademicPeriodDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-academic-period"
import { EditAcademicPeriodButton } from "@/features/establishment/academic-period/components/edit-academic-period-button"
import { DeactivateReservationDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-deactivate-reservation"
import { ActivateReservationDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-activate-reservation"
import { Authorization } from "@/lib/authorization"

function StatusCell({ status }: { status: AcademicPeriodStatus }) {
  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()
  const label = statusOptions.find((o) => o.key === status)?.label ?? status
  return <span>{label}</span>
}

function ReservationStatusCell({ enabled }: { enabled: boolean }) {
  // Badge dedicado (no reutiliza el de estado de periodo) porque "Activo"/
  // "Inactivo" se refiere al flag de reserva de cupos, no al `ESTADOPERIODO`.
  return (
    <Badge {...RESERVATION_STATUS_BADGE[enabled ? "active" : "inactive"]}>
      {enabled ? "Activo" : "Inactivo"}
    </Badge>
  )
}

const VISIBLE_BREAKS = 2

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
    // Estado del periodo de reserva de cupos (independiente del `status`
    // general del periodo académico). Lo entrega el backend mapeado de
    // `RESERVA: "S"|"N"` en `use-academic-periods.ts`.
    id: "reservationEnabled",
    accessorKey: "reservationEnabled",
    meta: { label: "Reserva de cupos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Reserva de cupos" />,
    cell: ({ row }) => (
      <ReservationStatusCell enabled={row.getValue<boolean>("reservationEnabled")} />
    ),
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
    id: "enrollmentDeadline",
    accessorKey: "enrollmentDeadline",
    meta: { label: "Fecha límite de matrícula" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha límite de matrícula" />,
    cell: ({ row }) => <span>{formatDate(row.original.enrollmentDeadline)}</span>,
  },
  {
    id: "previousPeriodName",
    accessorKey: "previousPeriodName",
    meta: { label: "Periodo anterior" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Periodo anterior" />,
    cell: ({ row }) => <span>{row.original.previousPeriodName ?? "—"}</span>,
  },
  {
    id: "schedule",
    accessorKey: "scheduleStartTime",
    meta: { label: "Horario" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Horario" />,
    cell: ({ row }) => {
      const { scheduleStartTime, scheduleEndTime } = row.original
      return <span>{scheduleStartTime && scheduleEndTime ? `${scheduleStartTime} - ${scheduleEndTime}` : "—"}</span>
    },
  },
  {
    id: "defaultBlocksCount",
    accessorKey: "defaultBlocksCount",
    meta: { label: "Bloques por defecto" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Bloques por defecto" />,
    cell: ({ row }) => <span>{row.original.defaultBlocksCount ?? "—"}</span>,
  },
  {
    id: "breaks",
    accessorKey: "breaks",
    meta: { label: "Descansos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Descansos" />,
    cell: ({ row }) => {
      const breaks = row.original.breaks ?? []
      if (breaks.length === 0) return <span>—</span>
      const visible = breaks.slice(0, VISIBLE_BREAKS)
      const remaining = breaks.slice(VISIBLE_BREAKS)
      const extra = remaining.length
      return (
        <div className="flex flex-nowrap items-center gap-1">
          {visible.map((b) => (
            <Badge key={`${b.startTime}-${b.endTime}`} variant="outline" color="neutral">
              {b.startTime}-{b.endTime}
            </Badge>
          ))}
          {extra > 0 ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" color="neutral" className="cursor-default">
                    +{extra}
                  </Badge>
                }
              />
              <TooltipContent>
                {remaining.map((b) => `${b.startTime}-${b.endTime}`).join(", ")}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <EditAcademicPeriodButton period={row.original} />
        <Authorization allowedRoles={["ADMIN"]}>
          {row.original.reservationEnabled ? (
            <DeactivateReservationDialog period={row.original} />
          ) : (
            <ActivateReservationDialog period={row.original} />
          )}
        </Authorization>
        <DeleteAcademicPeriodDialog period={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 128,
  },
]

export type AcademicPeriodTable = Table<AcademicPeriod>
