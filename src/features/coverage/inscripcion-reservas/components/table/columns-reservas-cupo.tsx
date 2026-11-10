"use no memo"

import type { ComponentType } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTableColumnHeader } from "@/components/data-table"
import {
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
  ArmchairIcon,
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  LockIcon,
  PersonAddIcon,
  PersonRemoveIcon,
  PersonWalkIcon,
  XCircleIcon,
  XIcon,
} from "@/components/ui/icons"

import { ESTADO_RESERVA_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

export type AccionReserva =
  | "VER_DETALLE"
  | "RESERVAR_CUPO"
  | "ASIGNAR_GRUPO"
  | "CAMBIAR_JORNADA_SEDE"
  | "SOLICITAR_TRASLADO"
  | "CANCELAR_TRASLADO"
  | "GENERAR_CONSTANCIA"
  | "LIBERAR"
  | "REGISTRAR_RETIRO"
  | "RESTITUIR"
  | "ACEPTAR_TRASLADO"
  | "RECHAZAR_TRASLADO"

const ACCIONES: Record<
  AccionReserva,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  VER_DETALLE: { label: "Ver detalle", icon: EyeIcon },
  RESERVAR_CUPO: { label: "Reservar cupo", icon: ArmchairIcon },
  ASIGNAR_GRUPO: { label: "Asignar grupo", icon: PersonAddIcon },
  CAMBIAR_JORNADA_SEDE: { label: "Cambiar jornada o sede", icon: ArrowsLeftRightIcon },
  SOLICITAR_TRASLADO: { label: "Solicitar traslado", icon: PersonWalkIcon },
  CANCELAR_TRASLADO: { label: "Cancelar traslado", icon: XCircleIcon },
  GENERAR_CONSTANCIA: { label: "Generar constancia de reserva", icon: FileTextIcon },
  LIBERAR: { label: "Liberar manualmente", icon: LockIcon },
  REGISTRAR_RETIRO: { label: "Registrar retiro", icon: PersonRemoveIcon },
  RESTITUIR: { label: "Restituir", icon: ArrowCounterClockwiseIcon },
  ACEPTAR_TRASLADO: { label: "Aceptar traslado", icon: CheckIcon },
  RECHAZAR_TRASLADO: { label: "Rechazar traslado", icon: XIcon },
}

/**
 * Acciones según el estado (Cobertura, Sección 3.2, "Acciones sobre una
 * reserva"). La reserva de origen Redistribución es protegida: el
 * establecimiento no la libera ni la traslada (Sección 3.5).
 */
export function accionesDeReserva(r: ReservaCupo): AccionReserva[] {
  if (r.trasladoEntrante) return ["VER_DETALLE", "ACEPTAR_TRASLADO", "RECHAZAR_TRASLADO"]
  const protegida = r.origen === "REDISTRIBUCION"
  const trasladoPendiente = r.estadoTraslado === "PENDIENTE"
  switch (r.estado) {
    case "RESERVADA":
      return [
        "VER_DETALLE",
        "ASIGNAR_GRUPO",
        "CAMBIAR_JORNADA_SEDE",
        ...(trasladoPendiente
          ? (["CANCELAR_TRASLADO"] as const)
          : protegida
            ? []
            : (["SOLICITAR_TRASLADO"] as const)),
        "GENERAR_CONSTANCIA",
        ...(protegida ? [] : (["LIBERAR"] as const)),
        "REGISTRAR_RETIRO",
      ]
    case "SIN_CONTINUIDAD":
      return ["VER_DETALLE", "RESERVAR_CUPO", "LIBERAR", "REGISTRAR_RETIRO"]
    case "LIBERADA":
      return ["VER_DETALLE", "RESTITUIR"]
    default:
      return ["VER_DETALLE"]
  }
}

function Marcas({ r }: { r: ReservaCupo }) {
  const marcas: { label: string; color: "orange" | "muted" }[] = []
  if (r.trasladoEntrante) marcas.push({ label: "Traslado entrante", color: "orange" })
  if (r.estado === "RESERVADA" && !r.trasladoEntrante && !r.confirmadaPorAcudiente) {
    marcas.push({ label: "Por confirmar", color: "orange" })
  }
  if (r.estadoTraslado === "PENDIENTE" && r.destinoTraslado) {
    marcas.push({ label: `Traslado pendiente hacia ${r.destinoTraslado}`, color: "orange" })
  }
  if (r.origen === "REDISTRIBUCION" && r.estado === "RESERVADA") {
    marcas.push({ label: "Ubicado por la entidad territorial", color: "muted" })
  }
  if (r.estado === "LIBERADA" && r.motivoLiberacion) {
    marcas.push({ label: r.motivoLiberacion, color: "muted" })
  }
  if (!marcas.length) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {marcas.map((m) => (
        <Badge key={m.label} variant="soft" color={m.color} className="max-w-full">
          <span className="truncate" title={m.label}>
            {m.label}
          </span>
        </Badge>
      ))}
    </div>
  )
}

// 7 botones de 32px + separación: el máximo que ofrece una reserva Reservada.
const ACTIONS_SIZE = 7 * 32 + 6 * 4 + 16

export function createColumns({
  onAction,
}: {
  onAction: (accion: AccionReserva, reserva: ReservaCupo) => void
}): ColumnDef<ReservaCupo>[] {
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
          aria-label={`Seleccionar reserva de ${row.original.estudiante}`}
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "estudiante",
      accessorKey: "estudiante",
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <span>
          {row.original.estudiante}
          {row.original.establecimientoOrigen ? (
            <span className="text-muted-foreground"> · {row.original.establecimientoOrigen}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "grado",
      accessorKey: "grado",
      meta: { label: "Grado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
    },
    {
      id: "sede",
      accessorKey: "sede",
      meta: { label: "Sede" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
    },
    {
      id: "jornada",
      accessorKey: "jornada",
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const ui = ESTADO_RESERVA_UI[row.original.estado]
        return (
          <Badge variant="soft" color={ui.color}>
            {ui.label}
          </Badge>
        )
      },
    },
    {
      id: "marcas",
      meta: { label: "Marcas" },
      header: "Marcas",
      enableSorting: false,
      cell: ({ row }) => <Marcas r={row.original} />,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: ACTIONS_SIZE,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        accionesDeReserva(row.original).map((accion) => {
          const { label, icon: Icon } = ACCIONES[accion]
          return (
            <Tooltip key={accion}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="muted"
                    size="icon-sm"
                    aria-label={`${label} — ${row.original.estudiante}`}
                    onClick={() => onAction(accion, row.original)}
                  />
                }
              >
                <Icon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          )
        }),
    },
  ]
}

export { ACCIONES }
