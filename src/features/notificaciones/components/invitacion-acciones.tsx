import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { useMarcarLeida } from "@/features/notificaciones/api/mutations/marcar-leida"
import {
  canalDeInvitacion,
  useAceptarInvitacion,
  useInvitacionesQuery,
  useRechazarInvitacion,
} from "@/features/comunicaciones/chat/api/query/use-invitaciones-query"

/**
 * Aceptar / Rechazar en la propia notificación CHAT_GRUPO_INVITACION (campana y página). Solo
 * mientras la invitación sigue pendiente (la lista de comms-service lo dice); al responder la
 * notificación queda leída. Aceptar abre el grupo.
 */
export function InvitacionAcciones({ notificacion: n, onAbrir }: { notificacion: Notificacion; onAbrir?: () => void }) {
  const canal = canalDeInvitacion(n.deepLink)
  const { data: pendientes } = useInvitacionesQuery(canal != null)
  const leida = useMarcarLeida()
  const navigate = useNavigate()
  const { notify } = useNotify()
  const marcar = () => {
    if (!n.leida) leida.mutate({ id: n.id, leida: true })
  }
  // Avisos y navegación en el hook (ver `useAceptarInvitacion`): al responder, la
  // invitación sale del cache y quien llamó `mutate` puede desmontarse antes de sus callbacks.
  const aceptar = useAceptarInvitacion({
    onAceptada: (c) => {
      marcar()
      notify(`Te uniste a ${c.nombre}.`)
      onAbrir?.()
      void navigate({ href: `${paths.app.comunicacionesChat.getHref()}?canal=${c.id}` })
    },
  })
  const rechazar = useRechazarInvitacion({
    onRechazada: () => {
      marcar()
      notify("Rechazaste la invitación al grupo.")
    },
  })
  if (canal == null) return null
  const pendiente = pendientes?.some((i) => i.conversacionId === canal)
  if (!pendiente) {
    return pendientes ? <p className="px-4 pb-2 pl-15 text-xs text-muted-foreground">Ya respondiste esta invitación.</p> : null
  }
  const ocupado = aceptar.isPending || rechazar.isPending
  const onError = (e: unknown) => notify(getErrorMessage(e), { variant: "error" })

  return (
    <div className="flex gap-2 px-4 pb-2.5 pl-15" role="group" aria-label={`Responder: ${n.titulo}`}>
      <Button
        type="button"
        size="sm"
        disabled={ocupado}
        aria-busy={aceptar.isPending}
        onClick={() =>
aceptar.mutate(canal, { onError })
        }
      >
        Aceptar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="fill"
        color="neutral"
        disabled={ocupado}
        aria-busy={rechazar.isPending}
        onClick={() =>
rechazar.mutate(canal, { onError })
        }
      >
        Rechazar
      </Button>
    </div>
  )
}
