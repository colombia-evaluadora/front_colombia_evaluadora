import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { CATEGORIA_ICONS, ENLACE_POR_TIPO } from "@/features/notificaciones/api/ui-mappings"
import { fechaCorta, horaDelDia } from "@/features/notificaciones/lib/agrupar-por-dia"
import { TIPO_INVITACION_GRUPO, tituloNotificacion } from "@/features/notificaciones/lib/deep-link"
import { InvitacionAcciones } from "@/features/notificaciones/components/invitacion-acciones"

interface NotificacionItemProps {
  notificacion: Notificacion
  onOpen: (notificacion: Notificacion) => void
  /**
   * `compact` (campana): fecha corta ("Hoy, 08:00"). Sin él (página, donde las
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

  if (!compact) {
    // Fila de la página (Figma "Notificaciones/Bandeja"): ícono 32px, título
    // con la etiqueta "Sin leer" en la misma línea, bajada en `text-sm` y la
    // hora como columna aparte arriba a la derecha.
    return (
      <>
        <button
          type="button"
          onClick={() => onOpen(n)}
          className="flex w-full min-w-0 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full",
              n.leida ? "bg-muted-22 text-muted-foreground" : "bg-primary-22 text-primary",
            )}
          >
            <Icono aria-hidden className="size-4.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn("min-w-0 text-sm text-foreground", !n.leida && "font-medium")}>{titulo}</span>
              {n.leida ? (
                <span className="sr-only">Leída</span>
              ) : (
                <Badge
                  variant="soft"
                  color="primary"
                  className="rounded-full border-primary-stroke font-medium tracking-normal text-foreground"
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                  Sin leer
                </Badge>
              )}
            </span>
            {n.cuerpo && (
              <span className="line-clamp-2 text-sm whitespace-normal text-muted-foreground">{n.cuerpo}</span>
            )}
            {ENLACE_POR_TIPO[n.tipo] && (
              <span className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                {ENLACE_POR_TIPO[n.tipo]}
              </span>
            )}
          </span>
          <time dateTime={n.creadaEn} className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {horaDelDia(n.creadaEn)}
          </time>
        </button>
        {n.tipo === TIPO_INVITACION_GRUPO && <InvitacionAcciones notificacion={n} onAbrir={onAccion} />}
      </>
    )
  }

  // Campana (Figma "Panel de la campana" › "Notificación"): ícono de 16px junto
  // al título (siempre en peso medio), fecha corta a la derecha, cuerpo y enlace
  // en 12px. El fondo (leída = gris) lo pone el `<li>` de la campana. El enlace solo dice a dónde
  // lleva: toda la entrada abre el `deepLink`.
  const enlace = ENLACE_POR_TIPO[n.tipo] ?? (n.deepLink ? "Abrir" : null)
  return (
    <>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className="flex w-full min-w-0 flex-col gap-1 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-inset"
      >
        <span className="flex w-full min-w-0 items-center gap-1.5">
          <Icono aria-hidden className="size-4 shrink-0 text-orange" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {titulo}
          </span>
          <time dateTime={n.creadaEn} className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {fechaCorta(n.creadaEn)}
          </time>
        </span>
        {n.cuerpo && <span className="line-clamp-2 text-xs text-foreground">{n.cuerpo}</span>}
        {enlace && <span className="text-xs text-primary underline-offset-2 hover:underline">{enlace}</span>}
        <span className="sr-only">{n.leida ? "Leída" : "Sin leer"}</span>
      </button>
      {/* Invitación a un grupo: Aceptar / Rechazar sin salir de la bandeja (fuera del botón). */}
      {n.tipo === TIPO_INVITACION_GRUPO && <InvitacionAcciones notificacion={n} onAbrir={onAccion} />}
    </>
  )
}
