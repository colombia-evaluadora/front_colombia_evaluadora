import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { PaperclipIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { TIPO_ASISTENCIA_DOT } from "@/features/academic-management/asistencia/api/ui-mappings"
import { EditarSeguimientoDialog } from "@/features/academic-management/asistencia/components/dialog-editar-seguimiento"
import type { AsistenciaQueryRow } from "@/features/academic-management/asistencia/api/types/asistencia"

export const columnsSeguimiento: ColumnDef<AsistenciaQueryRow>[] = [
  {
    id: "estudiante",
    accessorKey: "estudiante",
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => <span className="font-medium">{row.original.estudiante}</span>,
  },
  {
    id: "tipo",
    accessorKey: "tipo_asistencia_valor",
    meta: { label: "Tipo de asistencia" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de asistencia" />,
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <span
          className={cn("size-2 shrink-0 rounded-full", TIPO_ASISTENCIA_DOT[row.original.tipo_asistencia_valor])}
          aria-hidden="true"
        />
        {row.original.tipo_asistencia}
      </span>
    ),
  },
  {
    id: "observacion",
    accessorKey: "observacion",
    meta: { label: "Observación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Observación" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.observacion ?? "-"}</span>
    ),
  },
  {
    id: "soporte",
    // Sin `accessorKey`: no viene de un solo campo -- combina
    // `tiene_soporte` y `soporte_nombre`.
    meta: { label: "Soporte" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Soporte" />,
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className={cn(
          "flex items-center gap-1.5",
          row.original.tiene_soporte ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <PaperclipIcon className="size-4 shrink-0" />
        {row.original.tiene_soporte ? row.original.soporte_nombre : "Sin soporte"}
      </span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => <EditarSeguimientoDialog row={row.original} />,
  },
]
