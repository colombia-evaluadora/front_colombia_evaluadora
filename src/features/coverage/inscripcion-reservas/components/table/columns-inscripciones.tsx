"use no memo"

import type { ComponentType } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckCircleIcon,
  CheckSquareIcon,
  EyeIcon,
  PencilIcon,
  PlusCircleIcon,
  ProhibitIcon,
  XCircleIcon,
} from "@/components/ui/icons"

import type { OpcionInscripcion } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import {
  ESTADO_OPCION_UI,
  SITUACION_EDAD_UI,
} from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"

export type AccionInscripcion =
  | "VER_DETALLE"
  | "EDITAR"
  | "ADMITIR"
  | "NO_ADMITIR"
  | "AMPLIAR"
  | "ANULAR"
  | "ELEGIR_OPCION"

export const ACCIONES_INSCRIPCION: Record<
  AccionInscripcion,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  VER_DETALLE: { label: "Ver detalle", icon: EyeIcon },
  EDITAR: { label: "Editar", icon: PencilIcon },
  ADMITIR: { label: "Admitir", icon: CheckCircleIcon },
  NO_ADMITIR: { label: "No admitir", icon: XCircleIcon },
  AMPLIAR: { label: "Ampliar inscripción", icon: PlusCircleIcon },
  ANULAR: { label: "Anular", icon: ProhibitIcon },
  ELEGIR_OPCION: { label: "Elegir opción", icon: CheckSquareIcon },
}

const admisible = (o: OpcionInscripcion) =>
  o.estadoOpcion === "PENDIENTE" || o.estadoOpcion === "EN_LISTA_ESPERA"

/** Acciones por fila según la Sección 3.3, "Acciones por fila". */
function accionesDe(o: OpcionInscripcion, sorteoEjecutado: boolean): AccionInscripcion[] {
  const activa = o.estadoInscripcion !== "ANULADA"
  const acciones: AccionInscripcion[] = ["VER_DETALLE"]
  if (activa) acciones.push("EDITAR")
  if (admisible(o)) acciones.push("ADMITIR", "NO_ADMITIR")
  // Regla 27: Inscrita o En lista de espera, menos de tres opciones y antes del sorteo.
  if (
    !sorteoEjecutado &&
    o.totalOpciones < 3 &&
    (o.estadoInscripcion === "INSCRITA" || o.estadoInscripcion === "EN_LISTA_ESPERA")
  ) {
    acciones.push("AMPLIAR")
  }
  if (activa) acciones.push("ANULAR")
  if (o.estadoInscripcion === "POR_ELEGIR") acciones.push("ELEGIR_OPCION")
  return acciones
}

export function Marca({
  label,
  color,
  punto,
}: {
  label: string
  color: "success" | "orange" | "info" | "muted" | "destructive" | "neutral"
  punto: boolean
}) {
  return (
    <Badge variant="soft" color={color} className="text-xs font-medium tracking-normal">
      {punto && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {label}
    </Badge>
  )
}

const ACTIONS_SIZE = 6 * 32 + 5 * 4 + 16

export function createInscripcionesColumns({
  sorteoEjecutado,
  fechaSorteo,
  onAction,
}: {
  sorteoEjecutado: boolean
  fechaSorteo: string
  onAction: (accion: AccionInscripcion, opcion: OpcionInscripcion) => void
}): ColumnDef<OpcionInscripcion>[] {
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
          aria-label={`Seleccionar la opción de ${row.original.aspirante}`}
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
      id: "posicion",
      accessorKey: "posicion",
      meta: { label: "Pos." },
      header: "Pos.",
      enableSorting: false,
      cell: ({ row }) => <span className="tabular-nums">{row.original.posicion}</span>,
    },
    {
      id: "numeroInscripcion",
      accessorKey: "numeroInscripcion",
      meta: { label: "Insc." },
      header: "Insc.",
      enableSorting: false,
      cell: ({ row }) => <span className="tabular-nums">{row.original.numeroInscripcion}</span>,
    },
    {
      id: "aspirante",
      accessorKey: "aspirante",
      meta: { label: "Aspirante" },
      header: "Aspirante",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <span>{row.original.aspirante}</span>
          {row.original.documentosIncompletos && (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Marca label="Documentos incompletos" color="orange" punto />
              </TooltipTrigger>
              <TooltipContent>Falta: {row.original.documentosFaltantes.join(", ")}.</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      id: "prioridad",
      accessorKey: "prioridad",
      meta: { label: "Prioridad" },
      header: "Prioridad",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block max-w-28 whitespace-normal">{row.original.prioridad ?? "—"}</span>
      ),
    },
    {
      id: "numeroSorteo",
      accessorKey: "numeroSorteo",
      meta: { label: "Sorteo" },
      header: "Sorteo",
      enableSorting: false,
      cell: ({ row }) => <span className="tabular-nums">{row.original.numeroSorteo ?? "—"}</span>,
    },
    {
      id: "opcion",
      meta: { label: "Opción" },
      header: "Opción",
      enableSorting: false,
      cell: ({ row }) => {
        const ui = ESTADO_OPCION_UI[row.original.estadoOpcion]
        return <Marca {...ui} label={`${row.original.preferencia} · ${ui.label}`} />
      },
    },
    {
      id: "situacionEdad",
      meta: { label: "Situación de edad" },
      header: "Situación de edad",
      enableSorting: false,
      cell: ({ row }) => <Marca {...SITUACION_EDAD_UI[row.original.situacionEdad]} />,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: ACTIONS_SIZE,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        accionesDe(row.original, sorteoEjecutado).map((accion) => {
          const { label, icon: Icon } = ACCIONES_INSCRIPCION[accion]
          const bloqueada = accion === "ADMITIR" && !sorteoEjecutado
          return (
            <Tooltip key={accion}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="muted"
                    size="icon-sm"
                    aria-label={`${label} — ${row.original.aspirante}`}
                    aria-disabled={bloqueada || undefined}
                    className={bloqueada ? "opacity-50" : undefined}
                    onClick={() => !bloqueada && onAction(accion, row.original)}
                  />
                }
              >
                <Icon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>
                {bloqueada
                  ? `El sorteo se ejecuta el ${fechaSorteo}; desde ese momento se habilita Admitir.`
                  : label}
              </TooltipContent>
            </Tooltip>
          )
        }),
    },
  ]
}
