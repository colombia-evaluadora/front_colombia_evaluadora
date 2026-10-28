"use no memo"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PencilIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { CalendarEntry } from "@/features/establishment/academic-period/api/types/academic-calendar"
import {
  CALENDAR_ENTRY_TYPE_LABELS,
  formatCalendarRange,
} from "@/features/establishment/academic-period/utils/academic-calendar"

interface CreateAcademicCalendarColumnsOptions {
  readOnly: boolean
  // Festivos que ya tienen su excepción: no se ofrece marcarlos otra vez.
  workedHolidays: Set<string>
  markingDate: string | null
  onMarkWorking: (holiday: CalendarEntry) => void
  onEdit: (entry: CalendarEntry) => void
  onDelete: (entry: CalendarEntry) => Promise<boolean>
}

export function createAcademicCalendarColumns({
  readOnly,
  workedHolidays,
  markingDate,
  onMarkWorking,
  onEdit,
  onDelete,
}: CreateAcademicCalendarColumnsOptions): ColumnDef<CalendarEntry>[] {
  const columns: ColumnDef<CalendarEntry>[] = [
    {
      id: "from",
      accessorKey: "from",
      meta: { label: "Fecha o rango" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha o rango" />,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatCalendarRange(row.original.from, row.original.to)}
        </span>
      ),
    },
    {
      id: "type",
      accessorFn: (row) => CALENDAR_ENTRY_TYPE_LABELS[row.type],
      meta: { label: "Tipo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    },
    {
      id: "origin",
      accessorKey: "origin",
      meta: { label: "Origen" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) =>
        row.original.origin === "FESTIVO" ? (
          <Badge variant="soft" color="info" className="border border-current/30">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            Festivo
          </Badge>
        ) : (
          <Badge variant="soft" color="muted" className="border border-current/20">
            Registrado
          </Badge>
        ),
    },
    {
      id: "reason",
      accessorKey: "reason",
      meta: { label: "Motivo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
      enableSorting: false,
    },
  ]
  if (readOnly) return columns

  return [
    ...columns,
    {
      id: "acciones",
      meta: { label: "Acciones" },
      header: () => <span>Acciones</span>,
      cell: ({ row }) => {
        const entry = row.original
        if (entry.origin === "FESTIVO") {
          if (workedHolidays.has(entry.from)) return null
          const marking = markingDate === entry.from
          return (
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              disabled={markingDate != null}
              aria-busy={marking}
              onClick={() => onMarkWorking(entry)}
            >
              {marking && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
              Marcar como hábil
            </Button>
          )
        }
        const range = formatCalendarRange(entry.from, entry.to)
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    onClick={() => onEdit(entry)}
                  />
                }
              >
                <span className="sr-only">Modificar {range}</span>
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>Modificar</TooltipContent>
            </Tooltip>
            <ConfirmRemoveButton
              label={`Eliminar ${range}`}
              title="Eliminar del calendario"
              description={`Se quitará «${entry.reason}» (${range}) del calendario.`}
              onConfirm={() => onDelete(entry)}
            />
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 170,
    },
  ]
}
