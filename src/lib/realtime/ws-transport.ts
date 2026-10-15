import type {
  ClientMessage,
  RealtimeConnection,
  RealtimeTransport,
  ServerMessage,
} from "@/lib/realtime/protocol"

/**
 * Transporte real: `WebSocket` nativo contra `VITE_APP_REALTIME_URL`
 * (D-1.5: `wss://rt.<dominio>` proxied por Cloudflare sin Worker). El ticket
 * de un solo uso va en la query; el JWT no.
 */
export function createWebSocketTransport(url: string): RealtimeTransport {
  return {
    connect(ticket, handlers): RealtimeConnection {
      const target = new URL(url, window.location.href)
      if (target.protocol === "http:") target.protocol = "ws:"
      if (target.protocol === "https:") target.protocol = "wss:"
      target.searchParams.set("ticket", ticket)
      const socket = new WebSocket(target)
      socket.onopen = () => handlers.onOpen()
      socket.onmessage = (e) => {
        try {
          handlers.onMessage(JSON.parse(String(e.data)) as ServerMessage)
        } catch {
          // Un frame ilegible se ignora: el `seq` siguiente lo delata si faltó algo.
        }
      }
      socket.onclose = (e) => handlers.onClose(e.code)
      return {
        send(message: ClientMessage) {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
        },
        close(code = 1000) {
          socket.onclose = null
          socket.close(code)
        },
      }
    },
  }
}
