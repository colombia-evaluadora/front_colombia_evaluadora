import { backoffDelay } from "@/lib/realtime/backoff"
import {
  CLOSE_FORBIDDEN,
  CLOSE_NORMAL,
  CLOSE_TOKEN_EXPIRED,
  type ClientMessage,
  type RealtimeConnection,
  type RealtimeEvent,
  type RealtimeStatus,
  type RealtimeTopic,
  type RealtimeTransport,
  type ServerMessage,
} from "@/lib/realtime/protocol"
import type { ConnectivityState } from "@/lib/offline/connectivity"

/** Ping de aplicación: hay proxies escolares que cortan WS inactivos (Risks). */
export const PING_INTERVAL_MS = 25_000

export interface TopicHandlers {
  onEvent: (event: RealtimeEvent) => void
  /** El servidor perdió el hueco (D-1.3): invalidar las queries del tópico. */
  onResync?: () => void
}

export interface ConnectivitySource {
  getState: () => ConnectivityState
  subscribe: (listener: (state: ConnectivityState) => void) => () => void
}

export interface RealtimeClientOptions {
  /** Puede ser perezoso para no cargar el mock en el bundle real. */
  transport: RealtimeTransport | (() => Promise<RealtimeTransport>)
  /** `POST /comms/ws-ticket` (D-1.2). */
  fetchTicket: () => Promise<string>
  /** Ante `4001`: refrescar la sesión (`getUser`). `false` = sin sesión. */
  refreshSession: () => Promise<boolean>
  /** `connectivityStore` de `lib/offline`: en `offline` no se reintenta. */
  connectivity?: ConnectivitySource
  random?: () => number
  pingIntervalMs?: number
}

export interface RealtimeClient {
  start: () => void
  /** Logout o cambio de usuario: cierra y olvida los cursores. */
  stop: () => void
  subscribe: (topic: RealtimeTopic, handlers: TopicHandlers) => () => void
  /** Señales efímeras ("escribiendo"); se descartan si no hay socket abierto. */
  sendEphemeral: (topic: RealtimeTopic, event: string, data?: unknown) => void
  getStatus: () => RealtimeStatus
  onStatus: (listener: (status: RealtimeStatus) => void) => () => void
  /** Último `seq` aplicado del tópico (para tests y diagnóstico). */
  getCursor: (topic: RealtimeTopic) => number | undefined
}

/**
 * Cliente de tiempo real independiente de React y del transporte. Reconecta
 * con backoff, reanuda cada tópico desde su último `seq`, descarta duplicados
 * y sigue a `connectivityStore` (no gasta reintentos sin red y reconecta en
 * cuanto vuelve).
 */
export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const random = options.random ?? Math.random
  const pingMs = options.pingIntervalMs ?? PING_INTERVAL_MS

  let status: RealtimeStatus = "idle"
  let started = false
  let connection: RealtimeConnection | null = null
  /** Invalida callbacks de conexiones viejas (un `connect` en vuelo tras `stop`). */
  let generation = 0
  let attempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pingTimer: ReturnType<typeof setInterval> | undefined
  let unsubscribeConnectivity: (() => void) | undefined
  let transport: RealtimeTransport | null =
    typeof options.transport === "function" ? null : options.transport

  const cursors = new Map<RealtimeTopic, number>()
  const topics = new Map<RealtimeTopic, Set<TopicHandlers>>()
  const statusListeners = new Set<(s: RealtimeStatus) => void>()

  function setStatus(next: RealtimeStatus) {
    if (status === next) return
    status = next
    for (const l of statusListeners) l(next)
  }

  function isOffline() {
    return options.connectivity?.getState().status === "offline"
  }

  function clearTimers() {
    clearTimeout(retryTimer)
    retryTimer = undefined
    clearInterval(pingTimer)
    pingTimer = undefined
  }

  function dropConnection() {
    generation += 1
    clearTimers()
    connection?.close(CLOSE_NORMAL)
    connection = null
  }

  function send(message: ClientMessage) {
    if (status === "open") connection?.send(message)
  }

  function joinTopic(topic: RealtimeTopic) {
    const afterSeq = cursors.get(topic)
    send(afterSeq != null ? { type: "resume", topic, afterSeq } : { type: "subscribe", topic })
  }

  function scheduleReconnect() {
    if (!started) return
    if (isOffline()) {
      setStatus("offline")
      return
    }
    setStatus("reconnecting")
    const delay = backoffDelay(attempt, random)
    attempt += 1
    clearTimeout(retryTimer)
    retryTimer = setTimeout(() => void connect(), delay)
  }

  function handleMessage(message: ServerMessage) {
    switch (message.type) {
      case "event": {
        const { type: _type, ...event } = message
        if (event.seq != null) {
          const last = cursors.get(event.topic)
          // Reanudación sin duplicados: lo ya aplicado se descarta.
          if (last != null && event.seq <= last) return
          cursors.set(event.topic, event.seq)
        }
        for (const h of topics.get(event.topic) ?? []) h.onEvent(event)
        return
      }
      case "subscribed":
        if (!cursors.has(message.topic)) cursors.set(message.topic, message.seq)
        return
      case "resync":
        cursors.set(message.topic, message.seq)
        for (const h of topics.get(message.topic) ?? []) h.onResync?.()
        return
      default:
        return
    }
  }

  async function connect() {
    if (!started || connection) return
    if (isOffline()) {
      setStatus("offline")
      return
    }
    const gen = ++generation
    setStatus("connecting")
    let ticket: string
    try {
      if (!transport) transport = await (options.transport as () => Promise<RealtimeTransport>)()
      ticket = await options.fetchTicket()
    } catch {
      if (gen === generation) scheduleReconnect()
      return
    }
    if (gen !== generation || !started) return

    connection = transport.connect(ticket, {
      onOpen() {
        if (gen !== generation) return
        attempt = 0
        setStatus("open")
        for (const topic of topics.keys()) joinTopic(topic)
        clearInterval(pingTimer)
        pingTimer = setInterval(() => send({ type: "ping" }), pingMs)
      },
      onMessage(message) {
        if (gen === generation) handleMessage(message)
      },
      onClose(code) {
        if (gen !== generation) return
        connection = null
        clearTimers()
        if (code === CLOSE_FORBIDDEN) {
          setStatus("forbidden")
          return
        }
        if (code === CLOSE_TOKEN_EXPIRED) {
          setStatus("connecting")
          options.refreshSession().then(
            (ok) => {
              if (gen !== generation || !started) return
              if (ok) void connect()
              else setStatus("forbidden")
            },
            () => gen === generation && scheduleReconnect(),
          )
          return
        }
        scheduleReconnect()
      },
    })
  }

  function onConnectivity(state: ConnectivityState) {
    if (!started) return
    if (state.status === "offline") {
      dropConnection()
      setStatus("offline")
    } else if (!connection && (status === "offline" || status === "reconnecting")) {
      // Volvió la red: no esperar el backoff acumulado.
      attempt = 0
      clearTimeout(retryTimer)
      void connect()
    }
  }

  return {
    start() {
      if (started) return
      started = true
      attempt = 0
      unsubscribeConnectivity = options.connectivity?.subscribe(onConnectivity)
      void connect()
    },

    stop() {
      started = false
      unsubscribeConnectivity?.()
      unsubscribeConnectivity = undefined
      dropConnection()
      cursors.clear()
      setStatus("idle")
    },

    subscribe(topic, handlers) {
      let set = topics.get(topic)
      const isNew = !set
      if (!set) {
        set = new Set()
        topics.set(topic, set)
      }
      set.add(handlers)
      if (isNew) joinTopic(topic)
      return () => {
        const current = topics.get(topic)
        current?.delete(handlers)
        if (current && current.size === 0) {
          topics.delete(topic)
          send({ type: "unsubscribe", topic })
        }
      }
    },

    sendEphemeral(topic, event, data) {
      send({ type: "ephemeral", topic, event, data })
    },

    getStatus: () => status,

    onStatus(listener) {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },

    getCursor: (topic) => cursors.get(topic),
  }
}
