import type { ComponentType } from "react"

import {
  CheckCircleFillIcon,
  ClipboardTextIcon,
  ClockCountdownIcon,
  XCircleIcon,
} from "@/components/ui/icons"

import type { ActividadStatus } from "@/features/planeador/api/types/actividad"

/**
 * Cuatro estados canónicos. Cada uno mapea a un Badge con su variante/color
 * del sistema de tokens y a un ícono. Las pantallas solo eligen la entrada
 * — la regla de qué color/icon usar vive acá, no en el componente.
 */
export const STATUS_BADGE: Record<
  ActividadStatus,
  {
    variant: "soft" | "outline"
    color: "warning" | "info" | "success" | "destructive"
    label: string
  }
> = {
  pending: { variant: "soft", color: "warning", label: "Pendiente" },
  "in-progress": { variant: "soft", color: "info", label: "En curso" },
  completed: { variant: "soft", color: "success", label: "Completada" },
  cancelled: { variant: "soft", color: "destructive", label: "Cancelada" },
}

/**
 * Ícono circular del status. Mismo set que los estados; la pantalla los
 * compone con `bg-{color}` para que el círculo tenga el color del estado.
 */
export const STATUS_ICON: Record<
  ActividadStatus,
  ComponentType<{ className?: string }>
> = {
  pending: ClipboardTextIcon,
  "in-progress": ClockCountdownIcon,
  completed: CheckCircleFillIcon,
  cancelled: XCircleIcon,
}

/**
 * Color sólido para el círculo del status en la card. Mapea a los tokens
 * `bg-yellow / bg-blue / bg-green / bg-red` que ya existen en el design
 * system. El ícono blanco se pinta encima.
 */
export const STATUS_RING: Record<ActividadStatus, string> = {
  pending: "bg-yellow",
  "in-progress": "bg-blue",
  completed: "bg-green",
  cancelled: "bg-red",
}
/**
 * Color de acento del status para texto y bordes (el círculo del ícono y el
 * porcentaje de avance de la card). Complementa a `STATUS_RING`, que da el
 * relleno sólido: acá el color va en el trazo, no en el fondo.
 */
export const STATUS_ACCENT: Record<ActividadStatus, string> = {
  pending: "border-yellow text-yellow",
  "in-progress": "border-blue text-blue",
  completed: "border-green text-green",
  cancelled: "border-red text-red",
}

/**
 * Estados como opciones de filtro (valor = clave canónica, etiqueta = la
 * misma que muestra el badge). Se deriva de `STATUS_BADGE` para que agregar
 * un estado no obligue a tocar dos listas.
 */
export const ESTADO_OPTIONS = (
  Object.keys(STATUS_BADGE) as ActividadStatus[]
).map((value) => ({ value, label: STATUS_BADGE[value].label }))

/**
 * Contra el backend real, algunas pantallas todavía arman `status` con un
 * mapeo incompleto/aproximado (ver el comentario de `status` en
 * `use-unidades-query.ts`) — un valor que no sea una de las 4 claves
 * canónicas rompía toda la card (`STATUS_ICON[status]` devolvía `undefined`
 * y React tiraba "Element type is invalid"). Estos 3 accesores degradan al
 * ícono/color de "pending" en vez de eso.
 */
const STATUS_FALLBACK: ActividadStatus = "pending"

export function statusIconFor(status: ActividadStatus): ComponentType<{ className?: string }> {
  return STATUS_ICON[status] ?? STATUS_ICON[STATUS_FALLBACK]
}

export function statusAccentFor(status: ActividadStatus): string {
  return STATUS_ACCENT[status] ?? STATUS_ACCENT[STATUS_FALLBACK]
}

export function statusRingFor(status: ActividadStatus): string {
  return STATUS_RING[status] ?? STATUS_RING[STATUS_FALLBACK]
}

export function statusBadgeFor(status: ActividadStatus): (typeof STATUS_BADGE)[ActividadStatus] {
  return STATUS_BADGE[status] ?? STATUS_BADGE[STATUS_FALLBACK]
}
