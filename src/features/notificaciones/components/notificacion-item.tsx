import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { CATEGORIA_ICONS } from "@/features/notificaciones/api/ui-mappings"
import { horaDelDia, tiempoRelativo } from "@/features/notificaciones/lib/agrupar-por-dia"
import { TIPO_INVITACION_GRUPO, tituloNotificacion } from "@/features/notificaciones/lib/deep-link"
import { InvitacionAcciones } from "@/features/notificaciones/components/invitacion-acciones"

interface NotificacionItemProps {
  notificacion: Notificacion
  onOpen: (notificacion: Notificacion) => void
  /**
   * `compact` (campana): una línea, hora relativa. Sin él (página, donde las
   * filas ya van agrupadas por día) se muestra la hora exacta: dos acciones
   * iguales con un minuto de diferencia no deben verse "a la vez".
   */
  compact?: boolean
  /** Tras aceptar una invitación desde la notificación (la campana se cierra). */
  onAccion?: () => void
}

/** Contenido clicable de una entrada de la bandeja: compartido por la campana y la página. */
export function NotificacionItem({
  notificacion: n,
  onOpen,
  compact = false,
  onAccion,
}: NotificacionItemProps) {
  const Icono = CATEGORIA_ICONS[n.categoria] ?? CATEGORIA_ICONS.SISTEMA
  const titulo = tituloNotificacion(n)

  return (
    <>
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        "flex w-full min-w-0 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        compact ? "px-4 py-2.5" : "py-0.5",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          n.leida ? "bg-muted text-muted-foreground" : "bg-blue-22 text-blue",
        )}
      >
        <Icono aria-hidden className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 text-sm",
              compact ? "truncate" : "whitespace-normal",
              n.leida ? "text-foreground" : "font-semibold",
            )}
          >
            {titulo}
          </span>
          <time
            dateTime={n.creadaEn}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
          >
            {compact ? tiempoRelativo(n.creadaEn) : horaDelDia(n.creadaEn)}
          </time>
        </span>
        {n.cuerpo && (
          <span
            className={cn(
              "text-sm text-muted-foreground",
              compact ? "truncate" : "line-clamp-2 whitespace-normal",
            )}
          >
            {n.cuerpo}
          </span>
        )}
        {/* La categoría no se muestra por fila: casi todo caía en "Sistema" y no
            aportaba; sigue disponible como filtro del buscador. */}
        {n.leida ? (
          <span className="sr-only">Leída</span>
        ) : (
          <span className="flex pt-0.5">
            <Badge variant="soft" color="info">
              Sin leer
            </Badge>
          </span>
        )}
      </span>
    </button>
    {/* Invitación a un grupo: Aceptar / Rechazar sin salir de la bandeja (fuera del botón). */}
    {n.tipo === TIPO_INVITACION_GRUPO && <InvitacionAcciones notificacion={n} onAbrir={onAccion} />}
    </>
  )
}
