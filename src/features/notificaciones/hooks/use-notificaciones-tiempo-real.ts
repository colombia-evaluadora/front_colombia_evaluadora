import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { topicoUsuario } from "@/lib/auth-mapper"
import { useRealtimeStatus, useRealtimeTopic } from "@/lib/realtime/use-realtime"
import { useAjustesChatQuery } from "@/features/comunicaciones/chat/api/query/use-ajustes-chat-query"
import { debeSonar, reproducirSonidoAviso } from "@/features/notificaciones/lib/sonido-aviso"

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

/** Ventana en la que se juntan los eventos de una ráfaga antes de refrescar la campana. */
export const REFRESCO_MS = 400

export function useNotificacionesTiempoReal() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  // Apagado global del sonido (ajustes del chat). Mientras carga, el defecto: suena.
  const ajustes = useAjustesChatQuery({ enabled: !!user && !user.offline })
  const sonidoActivo = ajustes.data?.sonido ?? true

  // Prefijo de todas las keys de la bandeja (lista, contador, preferencias). Un mensaje del chat
  // trae en ráfaga `conversacion.actualizada` + `notification.created` (+ `read_all` si se lee en
  // el acto): se juntan en un solo refetch en vez de pedir lista y contador tres veces, que sumaba
  // carga al gateway justo cuando el mensaje tiene que verse en vivo.
  const pendiente = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const refrescar = () => {
    if (pendiente.current) return
    pendiente.current = setTimeout(() => {
      pendiente.current = undefined
      void queryClient.invalidateQueries({ queryKey: ["notificaciones"] })
    }, REFRESCO_MS)
  }
  useEffect(() => () => clearTimeout(pendiente.current), [])

  useRealtimeTopic(
    user && !user.offline ? topicoUsuario(user) : null,
    (e) => {
      // Red de seguridad: casi todo aviso del chat (mensaje, agregado, quitado,
      // salida, encuesta/elección abierta) llega junto con un
      // `conversacion.actualizada` en este mismo tópico. Si el
      // `notification.created` se pierde (gateway best-effort), la campana se
      // pone al día igual.
      // Alerta sonora (HU 7): notification-service marca `sonar` (sin Ocupado, sin horario
      // silencioso, con el sonido de la conversación encendido); acá, el apagado global.
      if (e.event === "notification.created" && debeSonar(e.data, sonidoActivo)) reproducirSonidoAviso()
      if (EVENTOS.has(e.event) || e.event === "conversacion.actualizada") refrescar()
    },
    () => refrescar(),
  )

  // Al reconectar el socket (deploy, red caída) pudo perderse cualquier evento.
  const status = useRealtimeStatus()
  const abiertoAntes = useRef(false)
  useEffect(() => {
    if (status !== "open") return
    if (abiertoAntes.current) refrescar()
    abiertoAntes.current = true
  }, [status])
}
