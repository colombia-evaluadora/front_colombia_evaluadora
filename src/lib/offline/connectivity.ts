/**
 * Única fuente de verdad de conectividad (D-0.5 de
 * `openspec/changes/add-offline-resilience/design.md`).
 *
 * `navigator.onLine === true` NO prueba que haya conexión: es verdadero en un
 * portal cautivo y con el gateway caído. Por eso el estado se alimenta de:
 *
 * - los eventos `online`/`offline` del navegador (`offline` manda de inmediato;
 *   `online` solo adelanta un heartbeat),
 * - los errores de red reales de axios (`reportNetworkFailure`) y las
 *   respuestas correctas (`reportSuccess`), que reporta `api-client.ts`,
 * - un heartbeat a `GET ${API_URL}/eval-col/health` (BE-4) sin auth y
 *   `no-store`, cada 30 s en `online`, 10 s en `degraded` y con backoff hasta
 *   60 s en `offline`, solo con la pestaña visible.
 *
 * Histéresis (para que el banner no parpadee con red intermitente):
 * - `offline` → `online` exige 2 heartbeats correctos separados 3 s.
 * - a `offline` solo se pasa por el evento `offline` o 2 fallas de red
 *   seguidas del heartbeat.
 * - `degraded` = 2+ errores de red en 60 s, latencia > 4 s, 5xx del gateway o
 *   portal cautivo (respuesta HTML, sin campo conocido o redirección).
 *
 * Sin dependencias de features ni de React: solo `env` y el `onlineManager`
 * de TanStack Query (para que las queries se pausen en `offline`).
 */
import { onlineManager } from "@tanstack/react-query"

import { env } from "@/config/env"

export type ConnectivityStatus = "online" | "degraded" | "offline"

/**
 * Por qué se está `degraded`/`offline`. Lo usa el banner para elegir el texto:
 * `captive-portal` agrega el aviso de Wi-Fi y `server` no culpa a la red del
 * usuario.
 */
export type ConnectivityReason = "network" | "slow" | "captive-portal" | "server"

export interface ConnectivityState {
  status: ConnectivityStatus
  /** `Date.now()` del último cambio de `status`. */
  since: number
  reason?: ConnectivityReason
}

type Listener = (state: ConnectivityState) => void

type HeartbeatResult = "ok" | "slow" | "captive-portal" | "server" | "network"

export const HEARTBEAT_PATH = "/eval-col/health"
export const ONLINE_INTERVAL_MS = 30_000
export const DEGRADED_INTERVAL_MS = 10_000
export const OFFLINE_MIN_INTERVAL_MS = 10_000
export const OFFLINE_MAX_INTERVAL_MS = 60_000
export const RECOVERY_CONFIRM_MS = 3_000
export const SLOW_LATENCY_MS = 4_000
export const HEARTBEAT_TIMEOUT_MS = 10_000
export const FAILURE_WINDOW_MS = 60_000
export const FAILURES_FOR_DEGRADED = 2
export const FAILURES_FOR_OFFLINE = 2

/** Campos que debe traer el JSON del health para no confundirlo con un portal. */
const KNOWN_HEALTH_FIELDS = ["status", "ok", "estado"]

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

function initialStatus(): ConnectivityStatus {
  return typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online"
}

let state: ConnectivityState = { status: initialStatus(), since: Date.now() }
const listeners = new Set<Listener>()

let started = false
let timer: ReturnType<typeof setTimeout> | undefined
let inFlight = false
/** Timestamps de errores de red recientes (ventana de 60 s). */
let failures: number[] = []
/** Fallas de red seguidas del heartbeat. */
let consecutiveHeartbeatFailures = 0
/** Heartbeats OK seguidos mientras se está `offline` (histéresis). */
let recoveryOks = 0
let offlineBackoffMs = OFFLINE_MIN_INTERVAL_MS
/**
 * Última respuesta correcta de la API (ms). Si una request respondió hace
 * nada, un heartbeat que "no llegó" no prueba que se cortó la red: lo más
 * probable es que el hilo estuviera ocupado (Preparar cifrando y guardando)
 * y el timeout del probe disparara tarde. Sin esto, "Preparar" quedaba
 * "sin conexión" con la red perfecta.
 */
let lastSuccessAt = 0

function setState(status: ConnectivityStatus, reason?: ConnectivityReason) {
  const nextReason = status === "online" ? undefined : reason
  if (state.status === status && state.reason === nextReason) return
  state = {
    status,
    since: state.status === status ? state.since : Date.now(),
    reason: nextReason,
  }
  if (status !== "offline") {
    offlineBackoffMs = OFFLINE_MIN_INTERVAL_MS
    recoveryOks = 0
  }
  for (const listener of listeners) listener(state)
}

function isVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden"
}

function nextInterval(): number {
  if (state.status === "online") return ONLINE_INTERVAL_MS
  if (state.status === "degraded") return DEGRADED_INTERVAL_MS
  if (recoveryOks > 0) return RECOVERY_CONFIRM_MS
  const delay = offlineBackoffMs
  offlineBackoffMs = Math.min(offlineBackoffMs * 2, OFFLINE_MAX_INTERVAL_MS)
  return delay
}

function schedule(delay?: number) {
  if (!started) return
  clearTimeout(timer)
  timer = undefined
  if (!isVisible()) return
  timer = setTimeout(() => void runHeartbeat(), delay ?? nextInterval())
}

export const PROBE_DRIFT_TOLERANCE_MS = 1_000
export const PROBE_DRIFT_GRACE_MS = 2_000

/**
 * Timeout del probe que no se deja engañar por un hilo bloqueado: si el timer
 * dispara mucho más tarde de lo pedido (el hilo estuvo ocupado), la respuesta
 * probablemente ya llegó y está en cola detrás del timer; se le da un margen
 * corto en lugar de abortar.
 */
function armProbeTimeout(controller: AbortController): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const arm = (ms: number, grace: boolean) => {
    const armedAt = Date.now()
    timeout = setTimeout(() => {
      const late = Date.now() - armedAt - ms
      if (!grace && late > PROBE_DRIFT_TOLERANCE_MS) arm(PROBE_DRIFT_GRACE_MS, true)
      else controller.abort()
    }, ms)
  }
  arm(HEARTBEAT_TIMEOUT_MS, false)
  return () => clearTimeout(timeout)
}

async function probe(): Promise<HeartbeatResult> {
  const controller = new AbortController()
  const clearProbeTimeout = armProbeTimeout(controller)
  const startedAt = Date.now()
  try {
    const response = await fetch(`${env.API_URL}${HEARTBEAT_PATH}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      // Un portal cautivo suele responder 302: con `manual` llega como
      // `opaqueredirect` en lugar de seguirlo hasta su HTML.
      redirect: "manual",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
    const latency = Date.now() - startedAt
    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
      return "captive-portal"
    }
    // 502 de Cloudflare / 503 de eval-col: el Worker responde, el servidor no.
    if (response.status >= 500) return "server"
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) return "captive-portal"
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return "captive-portal"
    }
    const known =
      body !== null &&
      typeof body === "object" &&
      KNOWN_HEALTH_FIELDS.some((field) => field in (body as Record<string, unknown>))
    if (!known) return "captive-portal"
    if (!response.ok) return "server"
    return latency > SLOW_LATENCY_MS ? "slow" : "ok"
  } catch {
    return "network"
  } finally {
    clearProbeTimeout()
  }
}

function applyHeartbeat(result: HeartbeatResult) {
  if (result === "network") {
    // La API respondió hace menos que el timeout del heartbeat: hay red.
    if (Date.now() - lastSuccessAt < HEARTBEAT_TIMEOUT_MS) return
    consecutiveHeartbeatFailures += 1
    recoveryOks = 0
    if (consecutiveHeartbeatFailures >= FAILURES_FOR_OFFLINE) setState("offline", "network")
    else if (state.status === "online") setState("degraded", "network")
    return
  }
  consecutiveHeartbeatFailures = 0

  if (result !== "ok") {
    setState("degraded", result)
    return
  }

  if (state.status === "offline") {
    recoveryOks += 1
    if (recoveryOks < 2) return
  }
  failures = []
  setState("online")
}

async function runHeartbeat() {
  if (inFlight) return
  inFlight = true
  try {
    applyHeartbeat(await probe())
  } finally {
    inFlight = false
  }
  schedule()
}

function handleOffline() {
  consecutiveHeartbeatFailures = FAILURES_FOR_OFFLINE
  setState("offline", "network")
  schedule()
}

function handleOnline() {
  // No se confía en el evento: se verifica con el heartbeat.
  schedule(0)
}

function handleVisibility() {
  schedule(isVisible() ? 0 : undefined)
}

export const connectivityStore = {
  getState(): ConnectivityState {
    return state
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /**
   * Error de red o timeout real de una request (lo llama `api-client.ts`).
   * `reason: "server"` (502/503 del gateway) hace que el banner no culpe a la
   * red del usuario.
   */
  reportNetworkFailure(reason?: string) {
    const now = Date.now()
    failures = [...failures.filter((t) => now - t < FAILURE_WINDOW_MS), now]
    if (state.status === "online" && failures.length >= FAILURES_FOR_DEGRADED) {
      setState("degraded", reason === "server" ? "server" : "network")
      schedule()
    }
  },

  /** Una request respondió: si se estaba degradado por errores de red, se sale. */
  reportSuccess() {
    lastSuccessAt = Date.now()
    if (state.status === "offline") {
      // La histéresis exige heartbeats: solo se adelanta la verificación.
      if (recoveryOks === 0) schedule(0)
      return
    }
    failures = []
    if (state.status === "degraded" && state.reason === "network") setState("online")
  },

  start() {
    if (started) return
    started = true
    if (isBrowser()) {
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
      document.addEventListener("visibilitychange", handleVisibility)
    }
    schedule(0)
  },

  stop() {
    if (!started) return
    started = false
    clearTimeout(timer)
    timer = undefined
    if (isBrowser()) {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  },
}

/**
 * ¿El equipo está sin conexión AHORA? El store manda; `navigator.onLine ===
 * false` también cuenta (es la única señal fiable de "sin red": un `true` no
 * prueba nada, pero un `false` sí) por si el evento todavía no llegó.
 */
export function isOfflineNow(): boolean {
  return state.status === "offline" || (typeof navigator !== "undefined" && navigator.onLine === false)
}

/** Solo para tests: vuelve al estado inicial. */
export function __resetConnectivityForTests(status: ConnectivityStatus = "online") {
  connectivityStore.stop()
  state = { status, since: Date.now() }
  failures = []
  consecutiveHeartbeatFailures = 0
  recoveryOks = 0
  offlineBackoffMs = OFFLINE_MIN_INTERVAL_MS
  inFlight = false
  lastSuccessAt = 0
}

/** Solo para tests: cambia el estado avisando a los suscriptores. */
export function __setConnectivityForTests(status: ConnectivityStatus) {
  setState(status, status === "online" ? undefined : "network")
}

/** Solo para tests: simula los eventos del navegador sin `window`. */
export const __connectivityEventsForTests = { handleOnline, handleOffline }

// TanStack Query pausa queries con `networkMode: "online"` cuando el
// `onlineManager` dice offline. Se alimenta de este store en lugar de
// `navigator.onLine` (que miente en portales cautivos).
onlineManager.setEventListener((setOnline) => {
  setOnline(state.status !== "offline")
  return connectivityStore.subscribe((s) => setOnline(s.status !== "offline"))
})
