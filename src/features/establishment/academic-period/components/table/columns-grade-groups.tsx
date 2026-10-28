"use no memo"

import type { ColumnDef, Table } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "@/components/ui/icons"

import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"
import { DeleteGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-delete-grade-group"
import { CreateGradeGroupDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-create-grade-group"

interface CreateGradeGroupColumnsOptions {
  academicPeriodId?: number
  gradeName?: string
  onOpenSchedule: (group: GradeGroup) => void
}

// Grupos del grado (Sección 5.3): el horario de cada grupo se abre debajo de la tabla.
export function createGradeGroupColumns({
  academicPeriodId,
  gradeName,
  onOpenSchedule,
}: CreateGradeGroupColumnsOptions): ColumnDef<GradeGroup>[] {
  return [
    {
      id: "codigo",
      accessorKey: "codigo",
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => <span>{row.original.codigo}</span>,
    },
    {
      id: "jornada",
      accessorKey: "jornada",
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      // `jornada` es el código corto; `jornadaName` el nombre que resuelve el back.
      cell: ({ row }) => <span>{row.original.jornadaName ?? row.original.jornada}</span>,
    },
    {
      id: "director",
      accessorKey: "directorName",
      meta: { label: "Responsable de grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Responsable de grupo" />,
      cell: ({ row }) => <span>{row.original.directorName || "—"}</span>,
    },
    {
      id: "metodologia",
      accessorKey: "metodologiaName",
      meta: { label: "Metodología" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Metodología" />,
      cell: ({ row }) => <span>{row.original.metodologiaName ?? row.original.metodologia ?? "—"}</span>,
    },
    {
      id: "cupo",
      accessorKey: "cupo",
      meta: { label: "Cupo" },
      header: () => <span className="block text-center">Cupo</span>,
      cell: ({ row }) => <span className="block text-center tabular-nums">{row.original.cupo ?? "—"}</span>,
    },
    {
      id: "horario",
      meta: { label: "Horario" },
      header: () => <span>Horario</span>,
      cell: ({ row }) => (
        <Button size="xs" variant="outline" color="neutral" onClick={() => onOpenSchedule(row.original)}>
          <CalendarIcon data-icon="inline-start" />
          Ver o editar
        </Button>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <CreateGradeGroupDialog gradeGroup={row.original} academicPeriodId={academicPeriodId} />
          <DeleteGradeGroupDialog gradeGroup={row.original} gradeName={gradeName} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}

export type GradeGroupTable = Table<GradeGroup>
