import {
  CLOSE_TOKEN_EXPIRED,
  type ClientMessage,
  type RealtimeConnection,
  type RealtimeEvent,
  type RealtimeTopic,
  type RealtimeTransport,
  type ServerMessage,
} from "@/lib/realtime/protocol"

/**
 * Gateway de tiempo real simulado en memoria (mismo contrato que
 * `add-tiempo-real-gateway/design.md`). Lo usan los handlers MSW para publicar
 * eventos y el cliente (`lib/realtime`) como transporte cuando
 * `VITE_APP_ENABLE_API_MOCKING=active`.
 *
 * Reproduce lo que importa para el front: tickets de un solo uso con TTL,
 * `seq` por tópico con historial acotado (→ `resync` si el hueco ya no está),
 * autorización de `user:<sub>` por identidad del ticket y eventos efímeros.
 */

export const TICKET_TTL_MS = 30_000
/** Retención del historial de reanudación por tópico (pregunta abierta 5). */
export const HISTORY_LIMIT = 500

interface Ticket {
  sub: string
  expiresAt: number
}

interface MockConnection {
  sub: string
  topics: Set<RealtimeTopic>
  deliver: (message: ServerMessage) => void
  close: (code: number) => void
}

type EphemeralListener = (sub: string, topic: RealtimeTopic, event: string, data: unknown) => void

const tickets = new Map<string, Ticket>()
const history = new Map<RealtimeTopic, RealtimeEvent[]>()
const seqs = new Map<RealtimeTopic, number>()
const connections = new Set<MockConnection>()
const ephemeralListeners = new Set<EphemeralListener>()
const connectListeners = new Set<(sub: string) => void>()

function randomTicket() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** `POST /comms/ws-ticket`: ticket aleatorio de 256 bits ligado al usuario. */
export function issueTicket(sub: string, now = Date.now()) {
  const ticket = randomTicket()
  tickets.set(ticket, { sub, expiresAt: now + TICKET_TTL_MS })
  return { ticket, expiresIn: TICKET_TTL_MS / 1000 }
}

/** Consume el ticket (un solo uso). `null` si no existe o venció. */
export function consumeTicket(ticket: string, now = Date.now()): string | null {
  const t = tickets.get(ticket)
  tickets.delete(ticket)
  if (!t || t.expiresAt < now) return null
  return t.sub
}

function canSubscribe(sub: string, topic: RealtimeTopic) {
  // D: un cliente no recibe eventos de la bandeja de otro usuario.
  if (topic.startsWith("user:")) return topic === `user:${sub}`
  return true
}

/** Publica un evento persistente (con `seq`) a los suscriptores del tópico. */
export function publish<T>(topic: RealtimeTopic, event: string, data: T): RealtimeEvent<T> {
  const seq = (seqs.get(topic) ?? 0) + 1
  seqs.set(topic, seq)
  const record: RealtimeEvent<T> = { topic, seq, event, data, at: new Date().toISOString() }
  const list = history.get(topic) ?? []
  list.push(record)
  if (list.length > HISTORY_LIMIT) list.splice(0, list.length - HISTORY_LIMIT)
  history.set(topic, list)
  broadcast(topic, record)
  return record
}

/** Evento efímero (escribiendo, presencia): sin `seq` ni historial. */
export function publishEphemeral<T>(topic: RealtimeTopic, event: string, data: T, exceptSub?: string) {
  broadcast(topic, { topic, event, data, at: new Date().toISOString() }, exceptSub)
}

function broadcast(topic: RealtimeTopic, record: RealtimeEvent, exceptSub?: string) {
  for (const c of connections) {
    if (c.topics.has(topic) && c.sub !== exceptSub) c.deliver({ type: "event", ...record })
  }
}

function handleClientMessage(conn: MockConnection, message: ClientMessage) {
  switch (message.type) {
    case "ping":
      conn.deliver({ type: "pong" })
      return
    case "subscribe":
    case "resume": {
      if (!canSubscribe(conn.sub, message.topic)) {
        conn.deliver({ type: "error", topic: message.topic, code: "forbidden" })
        return
      }
      conn.topics.add(message.topic)
      const current = seqs.get(message.topic) ?? 0
      if (message.type === "subscribe") {
        conn.deliver({ type: "subscribed", topic: message.topic, seq: current })
        return
      }
      const list = history.get(message.topic) ?? []
      const oldest = list[0]?.seq ?? current + 1
      // Hueco fuera del historial: el cliente debe refrescar por REST.
      if (message.afterSeq < current && message.afterSeq + 1 < oldest) {
        conn.deliver({ type: "resync", topic: message.topic, seq: current })
        return
      }
      for (const e of list) if ((e.seq ?? 0) > message.afterSeq) conn.deliver({ type: "event", ...e })
      return
    }
    case "unsubscribe":
      conn.topics.delete(message.topic)
      return
    case "ephemeral":
      if (!conn.topics.has(message.topic)) return
      for (const l of ephemeralListeners) l(conn.sub, message.topic, message.event, message.data)
      publishEphemeral(message.topic, message.event, message.data, conn.sub)
      return
  }
}

/** Para que la simulación reaccione al "escribiendo" del usuario. */
export function onEphemeral(listener: EphemeralListener) {
  ephemeralListeners.add(listener)
  return () => ephemeralListeners.delete(listener)
}

/** Para arrancar la simulación cuando el primer cliente se conecta. */
export function onConnect(listener: (sub: string) => void) {
  connectListeners.add(listener)
  return () => connectListeners.delete(listener)
}

/**
 * Corta todas las conexiones (simula un redeploy o un corte de red). Útil
 * desde la consola: `__realtimeMock.dropAll()` / `dropAll(4001)`.
 */
export function dropAll(code = 1006) {
  for (const c of [...connections]) c.close(code)
}

/** Simula que el servidor vació el historial (fuerza `resync` al reanudar). */
export function forgetHistory() {
  history.clear()
}

export const mockRealtimeTransport: RealtimeTransport = {
  connect(ticket, handlers): RealtimeConnection {
    let closed = false
    const sub = consumeTicket(ticket)
    const conn: MockConnection = {
      sub: sub ?? "",
      topics: new Set(),
      // Asíncrono como un socket real: nunca reentra en el emisor.
      deliver: (message) => queueMicrotask(() => !closed && handlers.onMessage(message)),
      close: (code) => {
        if (closed) return
        closed = true
        connections.delete(conn)
        setTimeout(() => handlers.onClose(code), 0)
      },
    }
    if (!sub) {
      // Handshake rechazado (ticket vencido o reutilizado).
      conn.close(CLOSE_TOKEN_EXPIRED)
      return { send: () => undefined, close: () => undefined }
    }
    connections.add(conn)
    setTimeout(() => {
      if (closed) return
      handlers.onOpen()
      for (const l of connectListeners) l(sub)
    }, 50)
    return {
      send: (message) => !closed && handleClientMessage(conn, message),
      close: () => {
        closed = true
        connections.delete(conn)
      },
    }
  },
}

/** Solo para tests. */
export function __resetMockRealtime() {
  tickets.clear()
  history.clear()
  seqs.clear()
  connections.clear()
  ephemeralListeners.clear()
  connectListeners.clear()
}
