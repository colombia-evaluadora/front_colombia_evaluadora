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
