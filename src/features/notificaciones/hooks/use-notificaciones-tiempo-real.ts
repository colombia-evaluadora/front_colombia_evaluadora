import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { topicoUsuario } from "@/lib/auth-mapper"
import { useRealtimeTopic } from "@/lib/realtime/use-realtime"

/**
 * Eventos de la bandeja en el tópico personal `user:<sub>` (notification-service,
 * PR SSO #690, retransmitidos por comms-service):
 *
 * - `notification.created` → fila nueva (misma forma que `GET /notificaciones`).
 * - `notification.read` / `notification.unread` / `notification.archived` → `{ id }`.
 * - `notification.read_all` → `{ categoria? }`.
 *
 * La bandeja se indexa por el `sub` del JWT (correo en minúsculas), no por un
 * id numérico: por eso el tópico sale de `topicoUsuario`. Como en el resto del
 * tiempo real (D-1.6) solo se invalida la cache; las lecturas siguen por REST
 * (cursor, agrupación y filtros los resuelve el servidor). Un `resync` también
 * invalida: pudo perderse cualquier cosa.
 */
const EVENTOS = new Set([
  "notification.created",
  "notification.read",
  "notification.unread",
  "notification.archived",
  "notification.read_all",
])

export function useNotificacionesTiempoReal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Prefijo de todas las keys de la bandeja (lista, contador, preferencias).
  const refrescar = () => void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })

  useRealtimeTopic(
    user && !user.offline ? topicoUsuario(user) : null,
    (e) => {
      if (EVENTOS.has(e.event)) refrescar()
    },
    () => refrescar(),
  )
}
