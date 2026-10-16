import { useNavigate } from "@tanstack/react-router"

import { useMarcarLeida } from "@/features/notificaciones/api/mutations/marcar-leida"
import type { Notificacion } from "@/features/notificaciones/api/types"
import { safeDeepLink } from "@/features/notificaciones/lib/deep-link"
import { useConnectivity } from "@/lib/offline/use-connectivity"

/**
 * Clic en una notificación (spec "Deep link"): la marca leída y navega a su
 * destino. Sin conexión la marca de leído no se encola todavía (D-2.7): se
 * navega igual y la notificación sigue no leída hasta abrirla con red.
 */
export function useAbrirNotificacion() {
  const navigate = useNavigate()
  const { status } = useConnectivity()
  const marcarLeida = useMarcarLeida()

  return (notificacion: Notificacion) => {
    if (!notificacion.leida && status !== "offline") {
      marcarLeida.mutate({ id: notificacion.id, leida: true })
    }
    void navigate({ href: safeDeepLink(notificacion.deepLink) })
  }
}
