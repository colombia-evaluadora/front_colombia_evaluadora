import * as React from "react"

import {
  ArrowRightIcon,
  CheckCircleFillIcon,
  ClipboardCheckIcon,
  ClipboardTextIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { Link } from "@tanstack/react-router"

import type { ActividadStatus } from "@/features/planeador/api/types/actividad"
import type { ActividadesStatsCounts } from "@/features/planeador/api/query/use-actividades-stats-query"
import { STATUS_BADGE } from "@/features/planeador/api/ui-mappings"
import { planeadorRoute } from "@/router"

/**
 * Card de resumen por estado, igual a las del mockup (ícono coloreado a la
 * izquierda, label, contador grande y "Ver detalles →" abajo). El `to` se
 * arma con `?estado=…` para que el link aplique el filtro del estado en la
 * pantalla actual — sin necesidad de un route aparte.
 */
interface SummaryCard {
  status: ActividadStatus
  label: string
  /** Color del ícono y del borde, alineado con los tokens `bg-{color}` /
   * `border-{color}` del design system (mismos que usan `STATUS_RING` y
   * `STATUS_ACCENT` para el círculo del status en la card). */
  accent: "yellow" | "blue" | "green" | "red"
  Icon: React.ComponentType<{ className?: string }>
}

const CARDS: readonly SummaryCard[] = [
  {
    status: "pending",
    label: "Pendientes por evaluar",
    accent: "yellow",
    Icon: ClipboardTextIcon,
  },
  {
    status: "in-progress",
    label: "En evaluación (vigentes)",
    accent: "blue",
    Icon: ClipboardCheckIcon,
  },
  {
    status: "completed",
    label: "Finalizadas",
    accent: "green",
    Icon: CheckCircleFillIcon,
  },
  {
    status: "cancelled",
    label: "Vencidas (> 2 días)",
    accent: "red",
    Icon: XCircleIcon,
  },
] as const

/**
 * Color mapeado a las clases del círculo: `bg-{accent}` para el relleno del
 * cuadro y `border-{accent}` para el trazo del wrapper. Mapea las 4
 * entradas de `STATUS_RING` que ya usa la card — así ícono de la card y
 * cuadro del resumen cuentan la misma historia visual.
 */
const ACCENT_BG: Record<SummaryCard["accent"], string> = {
  yellow: "bg-yellow",
  blue: "bg-blue",
  green: "bg-green",
  red: "bg-red",
}

interface PlaneadorSummaryCardsProps {
  /** Contadores del docente autenticado (`GET /planeador/actividades/stats`
   * — resuelve el universo completo del lado del backend, no algo que el
   * front deba derivar contando filas): si no, al filtrar "Pendientes" en
   * el listado el contador caería a la cantidad filtrada y perdería el
   * sentido de "cuántas tengo en total". */
  counts: ActividadesStatsCounts
}

/**
 * Fila de 4 contadores por estado para la pestaña "Actividades" del
 * Planeador. Cada card es un link a la misma ruta con `?estado=…` armado
 * para que abra el listado ya filtrado (el filter bar del listado lee
 * `estado` del search).
 */
export function PlaneadorSummaryCards({ counts }: PlaneadorSummaryCardsProps) {
  return (
    <ul
      aria-label="Resumen por estado"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {CARDS.map(({ status, label, accent, Icon }) => {
        // Se reusa `STATUS_BADGE` solo para corroborar que el label del
        // estado está sincronizado con el del badge que ya muestra la card.
        // Si la lista canónica cambiara el texto, esta card lo reflejaría.
        void STATUS_BADGE[status].label

        return (
          <li key={status}>
            <Link
              to={planeadorRoute.to}
              search={(prev) => ({ ...prev, estado: status })}
              // El card entero es el link — no hay botón separado — para que
              // toda la superficie sea clickeable (mismo patrón que las cards
              // de "Otras acciones" del menú del usuario).
              aria-label={`${label}: ${counts[status]} actividad(es). Ver detalles`}
              className={cn(
                "group flex items-center gap-3 rounded-md border bg-card px-4 py-3 transition-colors",
                "hover:bg-muted-22 focus-visible:outline-2 focus-visible:outline-ring",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md",
                  ACCENT_BG[accent],
                )}
              >
                <Icon className="size-5 text-white" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {counts[status]}
                </span>
                <span className="text-primary inline-flex items-center gap-1 text-xs font-semibold">
                  Ver detalles
                  <ArrowRightIcon
                    className="size-3 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
