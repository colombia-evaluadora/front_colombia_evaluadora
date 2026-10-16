/**
 * Contrato del socket de tiempo real (`openspec/changes/add-tiempo-real-gateway/design.md`).
 *
 * - D-1.2: el socket se abre con un ticket corto de un solo uso
 *   (`POST /comms/ws-ticket` → `{ ticket, expiresIn }`); el JWT nunca viaja
 *   en la URL.
 * - D-1.3: cada evento persistente lleva `seq` monotónico por tópico. Al
 *   reconectar el cliente manda `resume { topic, afterSeq }`; si el servidor ya
 *   no tiene el hueco responde `resync` y el cliente invalida sus queries.
 * - D-1.4: cierre `4001` = token vencido (refrescar y reconectar), `4003` =
 *   acceso revocado (no reintentar).
 * - D-1.6: los eventos solo parchean o invalidan la cache de TanStack Query.
 *
 * Los eventos efímeros ("escribiendo", presencia) no llevan `seq`: no se
 * guardan en el historial ni avanzan el cursor. Que el "escribiendo" viaje por
 * el socket (y no por REST) es una decisión pendiente de
 * `add-comunicaciones-mensajeria-mvp`; aquí queda aislado en `sendEphemeral`.
 */

/** Tópicos: `user:<sub>` (bandeja personal), `canal:<id>`, `presencia`. */
export type RealtimeTopic = string

export interface RealtimeEvent<T = unknown> {
  topic: RealtimeTopic
  /** Ausente en eventos efímeros. */
  seq?: number
  event: string
  data: T
  at: string
}

export type ServerMessage =
  | ({ type: "event" } & RealtimeEvent)
  /** Confirmación de suscripción con el `seq` actual del tópico. */
  | { type: "subscribed"; topic: RealtimeTopic; seq: number }
  /** El historial pedido ya no está: el cliente debe refrescar por REST. */
  | { type: "resync"; topic: RealtimeTopic; seq: number }
  | { type: "error"; topic?: RealtimeTopic; code: "forbidden" | "bad-request" }
  | { type: "pong" }

export type ClientMessage =
  | { type: "subscribe"; topic: RealtimeTopic }
  | { type: "resume"; topic: RealtimeTopic; afterSeq: number }
  | { type: "unsubscribe"; topic: RealtimeTopic }
  | { type: "ephemeral"; topic: RealtimeTopic; event: string; data?: unknown }
  | { type: "ping" }

/** Códigos de cierre de aplicación (D-1.4). */
export const CLOSE_TOKEN_EXPIRED = 4001
export const CLOSE_FORBIDDEN = 4003
/** Cierre pedido por el propio cliente (logout, offline): no se reintenta. */
export const CLOSE_NORMAL = 1000

export interface RealtimeConnectHandlers {
  onOpen: () => void
  onMessage: (message: ServerMessage) => void
  onClose: (code: number) => void
}

export interface RealtimeConnection {
  send: (message: ClientMessage) => void
  close: (code?: number) => void
}

/**
 * Cómo se abre el socket. En producción es `WebSocket` nativo; con MSW es un
 * servidor en memoria (`src/mocks/realtime`), así el prototipo recibe eventos
 * en vivo sin backend.
 */
export interface RealtimeTransport {
  connect: (ticket: string, handlers: RealtimeConnectHandlers) => RealtimeConnection
}

export type RealtimeStatus =
  /** Sin iniciar o detenido (logout). */
  | "idle"
  | "connecting"
  | "open"
  /** Esperando el backoff para reintentar. */
  | "reconnecting"
  /** `connectivityStore` dice offline: no se intenta hasta que vuelva. */
  | "offline"
  /** Cerrado con `4003` o sin sesión tras `4001`: no se reintenta. */
  | "forbidden"
