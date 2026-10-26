import { paths } from "@/config/paths"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ChatTextIcon, UsersThreeIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { horaVistaPrevia, lineaVistaPrevia } from "@/features/comunicaciones/chat/lib/vista-previa"
import { AvatarColevabot } from "@/features/comunicaciones/chat/components/tarjeta-bot"
import { conversacionesCampana } from "@/features/notificaciones/lib/mensajes-campana"
import type { useConversacionesCampana } from "@/features/notificaciones/hooks/use-mensajes-campana"

const CHAT_HREF = paths.app.comunicacionesChat.getHref()

/**
 * Pestaña "Mensajes" de la campana (HU "acceder a Mensajes desde la campana"): conversaciones
 * recientes con su vista previa y no leídos; al elegir una se abre en el chat.
 */
export function MensajesCampana({
  query,
  onAbrir,
}: {
  query: ReturnType<typeof useConversacionesCampana>
  onAbrir: (href: string) => void
}) {
  const lista = conversacionesCampana(query.data ?? [])
  if (query.isPending) {
    return (
      <div className="grid place-items-center py-8">
        <Spinner />
      </div>
    )
  }
  if (query.isError && lista.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyTitle>No se pudieron cargar los mensajes</EmptyTitle>
          <EmptyDescription>{getErrorMessage(query.error)}</EmptyDescription>
        </EmptyHeader>
        <Button size="sm" variant="link" onClick={() => void query.refetch()}>
          Reintentar
        </Button>
      </Empty>
    )
  }
  if (lista.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChatTextIcon />
          </EmptyMedia>
          <EmptyTitle>No tienes conversaciones</EmptyTitle>
          <EmptyDescription>Los mensajes del chat aparecerán aquí.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <ul className="divide-y" aria-label="Conversaciones recientes">
      {lista.map((c) => {
        const pendientes = c.noLeidos > 0
        return (
          <li key={c.id} className={cn("hover:bg-muted/50", pendientes && "bg-blue-22/40")}>
            <button
              type="button"
              onClick={() => onAbrir(`${CHAT_HREF}?canal=${c.id}`)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
            >
              {c.esBot ? (
                <AvatarColevabot />
              ) : c.tipo === "DIRECTO" ? (
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-22 text-xs font-semibold text-navy"
                >
                  {iniciales(c.nombre)}
                </span>
              ) : (
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-muted">
                  {c.tipo === "GRUPO" ? <UsersThreeIcon className="size-4.5" /> : <ChatTextIcon className="size-4.5" />}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", pendientes && "font-semibold")}>
                    {c.nombre}
                  </span>
                  {c.ultimoMensaje && (
                    <time dateTime={c.ultimoMensaje.enviadoEn} className="shrink-0 text-[11px] text-muted-foreground">
                      {horaVistaPrevia(c.ultimoMensaje.enviadoEn)}
                    </time>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {lineaVistaPrevia(c) || "Sin mensajes"}
                  </span>
                  {pendientes && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-orange px-1.5 text-xs font-medium text-orange-foreground">
                      <span className="sr-only">Sin leer: </span>
                      {c.noLeidos}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
