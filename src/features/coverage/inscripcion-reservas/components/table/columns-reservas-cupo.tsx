"use no memo"

import type { ComponentType } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/data-table"
import {
  ArrowCounterClockwiseIcon,
  ArrowsLeftRightIcon,
  ArmchairIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  FileTextIcon,
  LockIcon,
  PaperPlaneTiltIcon,
  PersonAddIcon,
  PersonRemoveIcon,
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
  { label: string; icon: ComponentType<{ className?: string }>; destructiva?: boolean }
> = {
  VER_DETALLE: { label: "Ver detalle", icon: EyeIcon },
  RESERVAR_CUPO: { label: "Reservar cupo", icon: ArmchairIcon },
  ASIGNAR_GRUPO: { label: "Asignar grupo", icon: PersonAddIcon },
  CAMBIAR_JORNADA_SEDE: { label: "Cambiar jornada o sede", icon: ArrowsLeftRightIcon },
  SOLICITAR_TRASLADO: { label: "Solicitar traslado", icon: PaperPlaneTiltIcon },
  CANCELAR_TRASLADO: { label: "Cancelar traslado", icon: XCircleIcon },
  GENERAR_CONSTANCIA: { label: "Generar constancia", icon: FileTextIcon },
  REGISTRAR_RETIRO: { label: "Registrar retiro", icon: PersonRemoveIcon },
  LIBERAR: { label: "Liberar manualmente", icon: LockIcon, destructiva: true },
  RESTITUIR: { label: "Restituir", icon: ArrowCounterClockwiseIcon },
  ACEPTAR_TRASLADO: { label: "Aceptar traslado", icon: CheckIcon },
  RECHAZAR_TRASLADO: { label: "Rechazar traslado", icon: XIcon, destructiva: true },
}

/**
 * Acciones según el estado (Cobertura, Regla 33), en el orden del prototipo.
 * La reserva de origen Redistribución es protegida: el establecimiento no la
 * libera ni la traslada (Sección 3.5).
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
        "GENERAR_CONSTANCIA",
        ...(trasladoPendiente
          ? (["CANCELAR_TRASLADO"] as const)
          : protegida
            ? []
            : (["SOLICITAR_TRASLADO"] as const)),
        "REGISTRAR_RETIRO",
        ...(protegida ? [] : (["LIBERAR"] as const)),
      ]
    case "SIN_CONTINUIDAD":
      return ["VER_DETALLE", "RESERVAR_CUPO", "REGISTRAR_RETIRO", "LIBERAR"]
    case "LIBERADA":
      return ["VER_DETALLE", "RESTITUIR"]
    default:
      return ["VER_DETALLE"]
  }
}

function Marcas({ r }: { r: ReservaCupo }) {
  const marcas: { label: string; color: "orange" | "muted" }[] = []
  if (r.estado === "RESERVADA" && !r.trasladoEntrante && !r.confirmadaPorAcudiente) {
    marcas.push({ label: "Por confirmar", color: "orange" })
  }
  if (!r.trasladoEntrante && r.estadoTraslado === "PENDIENTE" && r.destinoTraslado) {
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
    <div className="flex max-w-64 flex-wrap gap-1">
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

const texto = (valor: string) => valor || <span className="text-muted-foreground">—</span>

function MenuAcciones({
  r,
  onAction,
}: {
  r: ReservaCupo
  onAction: (accion: AccionReserva, reserva: ReservaCupo) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            color="neutral"
            size="icon-sm"
            aria-label={`Opciones de la reserva de ${r.estudiante}`}
          />
        }
      >
        <DotsThreeVerticalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {accionesDeReserva(r).map((accion) => {
          const { label, icon: Icon, destructiva } = ACCIONES[accion]
          return (
            <DropdownMenuItem
              key={accion}
              variant={destructiva ? "destructive" : "default"}
              // El prototipo usa texto normal, no las mayúsculas del menú por defecto.
              className="text-sm font-normal tracking-normal normal-case"
              onClick={() => onAction(accion, r)}
            >
              <Icon className="size-4" />
              {label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function createColumns({
  onAction,
}: {
  onAction: (accion: AccionReserva, reserva: ReservaCupo) => void
}): ColumnDef<ReservaCupo>[] {
  return [
    {
      id: "estudiante",
      accessorKey: "estudiante",
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <span>
          {row.original.estudiante}
          {row.original.establecimientoOrigen ? (
            <span className="text-muted-foreground"> ({row.original.establecimientoOrigen})</span>
          ) : null}
        </span>
      ),
    },
    {
      id: "grado",
      accessorKey: "grado",
      meta: { label: "Grado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grado" />,
      cell: ({ row }) => texto(row.original.grado),
    },
    {
      id: "sede",
      accessorKey: "sede",
      meta: { label: "Sede" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede" />,
      cell: ({ row }) => texto(row.original.sede),
    },
    {
      id: "jornada",
      accessorKey: "jornada",
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      cell: ({ row }) => texto(row.original.jornada),
    },
    {
      id: "estado",
      accessorKey: "estado",
      meta: { label: "Estado" },
      header: "Estado",
      enableSorting: false,
      cell: ({ row }) => {
        // El entrante no es una reserva de aquí: se muestra el estado de su traslado.
        if (row.original.trasladoEntrante) {
          return (
            <Badge variant="soft" color="orange">
              Traslado entrante · Pendiente
            </Badge>
          )
        }
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
      // No es la columna especial "actions" (botones al pasar el mouse): el
      // prototipo deja el menú de tres puntos siempre visible.
      id: "opciones",
      enableHiding: false,
      enableSorting: false,
      size: 56,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <MenuAcciones r={row.original} onAction={onAction} />
        </div>
      ),
    },
  ]
}

export { ACCIONES }
