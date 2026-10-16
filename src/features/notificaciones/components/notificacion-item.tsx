import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { CATEGORIA_ICONS, CATEGORIA_LABELS } from "@/features/notificaciones/api/ui-mappings"
import { formatActores } from "@/features/notificaciones/lib/deep-link"
import { tiempoRelativo } from "@/features/notificaciones/lib/agrupar-por-dia"

interface NotificacionItemProps {
  notificacion: Notificacion
  onOpen: (notificacion: Notificacion) => void
  /** Acciones por fila (solo en la página); van fuera del botón principal. */
  actions?: ReactNode
  compact?: boolean
}

/** Entrada de la bandeja: compartida por la campana y la página. */
export function NotificacionItem({ notificacion: n, onOpen, actions, compact = false }: NotificacionItemProps) {
  const Icono = CATEGORIA_ICONS[n.categoria] ?? CATEGORIA_ICONS.SISTEMA
  const actores = formatActores(n.actores, n.conteo)

  return (
    <div
      className={cn(
        "group/notif flex items-start gap-2 hover:bg-muted/50 focus-within:bg-muted/50",
        !n.leida && "bg-blue-22/40",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none",
          compact ? "px-4 py-2" : "px-4 py-3",
        )}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
          title={CATEGORIA_LABELS[n.categoria]}
        >
          <Icono aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 text-sm", compact && "truncate", !n.leida && "font-semibold")}>
              {actores ? `${actores}: ` : ""}
              {n.titulo}
            </span>
            <time dateTime={n.creadaEn} className="shrink-0 text-xs text-muted-foreground">
              {tiempoRelativo(n.creadaEn)}
            </time>
          </span>
          {n.cuerpo && (
            <span className={cn("block text-sm text-muted-foreground", compact ? "truncate" : "line-clamp-2")}>
              {n.cuerpo}
            </span>
          )}
          <span className="sr-only">{n.leida ? "Leída" : "No leída"}</span>
        </span>
        {!n.leida && <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-blue" />}
      </button>
      {actions && <div className="flex shrink-0 items-center gap-1 py-3 pr-3">{actions}</div>}
    </div>
  )
}
