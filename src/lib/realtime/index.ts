/**
 * Instancia única del cliente de tiempo real.
 *
 * - Con MSW activo usa el gateway simulado en memoria (`src/mocks/realtime`),
 *   cargado de forma perezosa para no meterlo en el bundle real.
 * - Sin mocks usa `WebSocket` contra `VITE_APP_REALTIME_URL`.
 * - Con `VITE_APP_REALTIME_URL` vacío (default) y sin mocks queda desactivado
 *   (`realtime === null`): las pantallas vuelven a su polling (Rollback de
 *   `add-tiempo-real-gateway/design.md`).
 */
import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { connectivityStore } from "@/lib/offline/connectivity"
import { createRealtimeClient, type RealtimeClient } from "@/lib/realtime/client"
import { createWebSocketTransport } from "@/lib/realtime/ws-transport"

export const WS_TICKET_PATH = "/comms/ws-ticket"

interface WsTicketResponse {
  ticket: string
  expiresIn: number
}

function createClient(): RealtimeClient | null {
  const transport = env.ENABLE_API_MOCKING
    ? () => import("@/mocks/realtime/server").then((m) => m.mockRealtimeTransport)
    : env.REALTIME_URL
      ? createWebSocketTransport(env.REALTIME_URL)
      : null
  if (!transport) return null
  return createRealtimeClient({
    transport,
    fetchTicket: async () => (await api.post<WsTicketResponse>(WS_TICKET_PATH)).ticket,
    // Import perezoso: `auth.ts` importa este módulo para cerrar el socket en logout.
    refreshSession: async () => {
      const { getUser } = await import("@/lib/auth")
      return (await getUser()) != null
    },
    connectivity: connectivityStore,
  })
}

export const realtime: RealtimeClient | null = createClient()

/** `true` si hay canal en vivo; si no, las pantallas deben hacer polling. */
export const realtimeEnabled = realtime != null

/** Cierra el socket y olvida cursores (logout / cambio de usuario). */
export function stopRealtime() {
  realtime?.stop()
}

export type { RealtimeEvent, RealtimeStatus, RealtimeTopic } from "@/lib/realtime/protocol"
