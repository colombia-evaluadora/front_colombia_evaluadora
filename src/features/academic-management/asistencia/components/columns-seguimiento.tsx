import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { PaperclipIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import {
  etiquetaBloques,
  formatHoraRango,
  nombreMateriaSeguimiento,
  TIPO_ASISTENCIA_DOT,
} from "@/features/academic-management/asistencia/api/ui-mappings"
import { EditarSeguimientoDialog } from "@/features/academic-management/asistencia/components/dialog-editar-seguimiento"
import type { AsistenciaQueryRow } from "@/features/academic-management/asistencia/api/types/asistencia"

function formatFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-")
  return `${dia}/${mes}/${anio}`
}

/** Regla 74: la columna de acciones (editar registro) solo se arma para quien puede escribir asistencia (docente) — Director de Grupo/Coordinador son de solo lectura. */
export function buildColumnsSeguimiento(canEditar: boolean): ColumnDef<AsistenciaQueryRow>[] {
  return [
  {
    id: "estudiante",
    accessorKey: "estudiante",
    enableHiding: false,
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => <span className="font-medium">{row.original.estudiante}</span>,
  },
  {
    id: "tipo",
    accessorKey: "tipo_asistencia_valor",
    enableHiding: false,
    meta: { label: "Tipo de asistencia" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de asistencia" />,
    cell: ({ row }) => {
      const esTarde = row.original.tipo_asistencia_valor === 5 || row.original.tipo_asistencia_valor === 6
      const bloques =
        esTarde && (row.original.bloques?.length ?? 0) > 1
          ? etiquetaBloques(row.original.bloques_estado)
          : null
      const rango = formatHoraRango(row.original.hora_inicio_estado, row.original.hora_fin_estado)
      return (
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span
              className={cn("size-2 shrink-0 rounded-full", TIPO_ASISTENCIA_DOT[row.original.tipo_asistencia_valor])}
              aria-hidden="true"
            />
            {row.original.tipo_asistencia}
            {row.original.cambio_pendiente && (
              <Badge variant="soft" color="orange">
                Pendiente de aprobación
              </Badge>
            )}
          </span>
          {bloques && (
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{bloques}</span>
              {rango && ` (${rango})`}
            </span>
          )}
        </span>
      )
    },
  },
  {
    id: "asignatura",
    accessorKey: "asignatura",
    enableHiding: false,
    meta: { label: "Asignatura" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asignatura" />,
    cell: ({ row }) => nombreMateriaSeguimiento(row.original),
  },
  {
    id: "grupo",
    accessorKey: "grupo",
    enableHiding: false,
    meta: { label: "Grado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    // Curso + grupo pegados, como en Asistencia: grado "-1" + grupo "02" -> "-102".
    cell: ({ row }) => `${row.original.grado_valor ?? ""}${row.original.grupo}`,
  },
  {
    id: "jornada",
    accessorKey: "jornada",
    // El listado no ordena por jornada (fn_asistencia_listar_seguimiento).
    enableSorting: false,
    meta: { label: "Jornada" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    cell: ({ row }) => row.original.jornada ?? "",
  },
  {
    id: "fecha",
    accessorKey: "fecha",
    enableHiding: false,
    meta: { label: "Fecha" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => formatFecha(row.original.fecha),
  },
  {
    id: "soporte",
    enableHiding: false,
    meta: { label: "Justificación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Justificación" />,
    enableSorting: false,
    cell: ({ row }) => {
      if (row.original.tipo_asistencia_valor === 1) return null
      return (
        <span
          className={cn(
            "flex items-center gap-1.5",
            row.original.tiene_soporte ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <PaperclipIcon className="size-4 shrink-0" />
          {row.original.tiene_soporte ? row.original.soporte_nombre : "Sin justificación"}
        </span>
      )
    },
  },
    ...(canEditar
      ? [
          {
            id: "actions",
            enableSorting: false,
            enableHiding: false,
            header: () => null,
            cell: ({ row }) => <EditarSeguimientoDialog row={row.original} />,
          } satisfies ColumnDef<AsistenciaQueryRow>,
        ]
      : []),
  ]
}
