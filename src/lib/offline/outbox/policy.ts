/**
 * Lógica pura de la outbox (testeable sin IndexedDB ni red): backoff (§6.3),
 * clasificación de errores (§6.4), selección FIFO por entidad + dependencias
 * (§6.5), resumen para la UI y ventana de 14 días (§0.2).
 */
import Axios from "axios"

import { isNetworkError } from "@/lib/network-error"
import type {
  ClassifiedError,
  OutboxConflict,
  OutboxOp,
  OutboxStatus,
  OutboxSummary,
} from "@/lib/offline/outbox/types"
import { EMPTY_SUMMARY } from "@/lib/offline/outbox/types"

const DAY_MS = 864e5
export const OUTBOX_WINDOW_MS = 14 * DAY_MS
export const OUTBOX_WARN_MS = 12 * DAY_MS
export const MAX_SERVER_ATTEMPTS = 8
export const MAX_BACKOFF_MS = 5 * 60_000
export const BASE_BACKOFF_MS = 2_000
export const CONCURRENCY = 3
export const INFLIGHT_STALE_MS = 60_000
export const DONE_RETENTION_MS = DAY_MS
export const DEDUPE_MS = 2_000

/** Códigos estables del backend (BE-8 / BE-2 / BE-5 / BE-1). */
export const ERROR_CODES = {
  conflict: "OFFLINE_CONFLICT",
  periodoCerrado: "PERIODO_CERRADO",
  idempotencyReused: "IDEMPOTENCY_KEY_REUSED",
  /** El gateway todavía procesa la misma clave (BE-1): se reintenta. */
  idempotencyInProgress: "IDEMPOTENCY_IN_PROGRESS",
} as const

/** `min(5 min, 2 s · 2^n) · random(0.8..1.2)`. */
export function backoffDelay(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts))
  return Math.round(base * (0.8 + random() * 0.4))
}

interface ErrorBody {
  code?: unknown
  errorCode?: unknown
  message?: unknown
  error?: unknown
  current?: unknown
  serverVersion?: unknown
  rows?: unknown
}

/** Código estable: campo `code`/`errorCode` o token en el mensaje (`RAISE` con prefijo). */
export function extractErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const body = data as ErrorBody
  for (const value of [body.code, body.errorCode]) {
    if (typeof value === "string" && value) return value
  }
  const message = typeof body.message === "string" ? body.message : ""
  const match = /\b(OFFLINE_CONFLICT|PERIODO_CERRADO|IDEMPOTENCY_KEY_REUSED|IDEMPOTENCY_IN_PROGRESS|CK_TASISTENCIA_CONTEXTO)\b/.exec(message)
  return match?.[1] ?? null
}

function messageOf(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const m = (data as ErrorBody).message
    if (typeof m === "string" && m.trim()) {
      const first = m.split(/\r?\n/)[0].trim()
      return first.replace(/^[A-Za-z ]+:\s*ERROR:\s*/i, "").replace(/^[A-Z_]+:\s*/, "").trim() || first
    }
  }
  return fallback
}

/**
 * El 409 de conflicto trae el valor actual: `{ code, current, serverVersion }`
 * o, desde PL/pgSQL, el JSON en `DETAIL` que el query-service pone en `detail`.
 */
export function extractConflict(data: unknown): OutboxConflict {
  if (!data || typeof data !== "object") return { server: null }
  const body = data as ErrorBody & { detail?: unknown }
  let parsed: unknown = body.current
  if (parsed === undefined && typeof body.detail === "string") {
    try {
      parsed = JSON.parse(body.detail)
    } catch {
      parsed = body.detail
    }
  }
  const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  const serverVersion =
    typeof body.serverVersion === "string"
      ? body.serverVersion
      : typeof obj?.version === "string"
        ? (obj.version as string)
        : null
  const rows = Array.isArray(obj?.rows) ? (obj.rows as OutboxConflict["rows"]) : undefined
  return { server: obj?.current ?? parsed ?? null, serverVersion, rows }
}

/** Clasificación por defecto (§6.4). `attempts` = intentos YA hechos antes de este. */
export function classifyError(error: unknown, attempts: number): ClassifiedError {
  if (isNetworkError(error)) {
    const status = Axios.isAxiosError(error) ? error.response?.status : undefined
    return { kind: "retry", error: { code: status ? "server-unavailable" : "network", status, message: "Sin conexión con el servidor." } }
  }
  if (!Axios.isAxiosError(error) || !error.response) {
    return { kind: "fatal", error: { code: "client", message: error instanceof Error ? error.message : String(error) } }
  }
  const { status, data, headers } = error.response
  const code = extractErrorCode(data)
  if (status === 401) return { kind: "auth", error: { code: "auth", status, message: "Tu sesión expiró." } }
  if (status === 429) {
    const ra = Number(headers?.["retry-after"])
    return {
      kind: "retry",
      retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
      error: { code: "rate-limit", status, message: "Demasiadas solicitudes; se reintentará." },
    }
  }
  if (code === ERROR_CODES.conflict) {
    return {
      kind: "conflict",
      conflict: extractConflict(data),
      error: { code, status, message: "Otra persona cambió este dato." },
    }
  }
  if (code === ERROR_CODES.idempotencyInProgress) {
    const ra = Number(headers?.["retry-after"])
    return {
      kind: "retry",
      retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra * 1000 : undefined,
      error: { code, status, message: "El servidor todavía procesa este cambio; se reintentará." },
    }
  }
  if (code === ERROR_CODES.idempotencyReused) {
    return { kind: "fatal", error: { code, status, message: "El cambio no coincide con uno ya enviado." } }
  }
  if (status === 403) {
    return { kind: "rejected", error: { code: "forbidden", status, message: "Ya no tienes permiso para este cambio." } }
  }
  if (status === 404) {
    return { kind: "rejected", error: { code: "not-found", status, message: "El registro ya no existe en el servidor." } }
  }
  if (status >= 500) {
    if (attempts + 1 >= MAX_SERVER_ATTEMPTS) {
      return { kind: "rejected", error: { code: "server", status, message: "El servidor no pudo procesar este cambio." } }
    }
    return { kind: "retry", error: { code: "server", status, message: "Error del servidor; se reintentará." } }
  }
  return {
    kind: "rejected",
    error: { code: code ?? `http-${status}`, status, message: messageOf(data, "El servidor rechazó este cambio.") },
  }
}

const OPEN: ReadonlySet<OutboxStatus> = new Set(["pending", "inflight", "retry", "conflict", "rejected", "blocked"])

export function isOpen(op: Pick<OutboxOp, "status">): boolean {
  return OPEN.has(op.status)
}

/**
 * Ops que se pueden enviar ahora: `pending`/`retry` vencidas, cabeza de su
 * `entityKey` (ninguna op abierta anterior en la misma entidad) y con sus
 * dependencias `done` (si una falta, se considera `done`: ya se purgó).
 */
export function selectReady(ops: OutboxOp[], now: number): OutboxOp[] {
  const byId = new Map(ops.map((op) => [op.id, op]))
  const head = new Map<string, OutboxOp>()
  for (const op of [...ops].sort((a, b) => a.seq - b.seq)) {
    if (!isOpen(op)) continue
    if (!head.has(op.entityKey)) head.set(op.entityKey, op)
  }
  return [...head.values()]
    .filter((op) => (op.status === "pending" || op.status === "retry") && op.nextAttemptAt <= now)
    .filter((op) => op.dependsOn.every((dep) => (byId.get(dep)?.status ?? "done") === "done"))
    .sort((a, b) => a.seq - b.seq)
}

/** Ops cuya dependencia quedó rechazada/bloqueada: pasan a `blocked`. */
export function selectBlocked(ops: OutboxOp[]): OutboxOp[] {
  const byId = new Map(ops.map((op) => [op.id, op]))
  return ops.filter(
    (op) =>
      (op.status === "pending" || op.status === "retry") &&
      op.dependsOn.some((dep) => {
        const s = byId.get(dep)?.status
        return s === "rejected" || s === "blocked"
      }),
  )
}

/** Dependientes transitivos (para descartar en cascada). */
export function dependentsOf(ops: OutboxOp[], id: string): OutboxOp[] {
  const out: OutboxOp[] = []
  const queue = [id]
  const seen = new Set<string>([id])
  while (queue.length) {
    const current = queue.shift() as string
    for (const op of ops) {
      if (!seen.has(op.id) && op.dependsOn.includes(current)) {
        seen.add(op.id)
        out.push(op)
        queue.push(op.id)
      }
    }
  }
  return out
}

export function summarize(ops: OutboxOp[], base: Partial<OutboxSummary> = {}): OutboxSummary {
  const s: OutboxSummary = { ...EMPTY_SUMMARY, ...base }
  for (const op of ops) {
    if (op.status === "pending" || op.status === "retry") s.pending++
    else if (op.status === "inflight") s.inflight++
    else if (op.status === "conflict") s.conflict++
    else if (op.status === "rejected") s.rejected++
    else if (op.status === "blocked") s.blocked++
    else if (op.status === "done") s.done++
  }
  s.total = s.pending + s.inflight + s.conflict + s.rejected + s.blocked
  return s
}

export type WindowState = { accepting: boolean; warn: boolean; deadline: number }

/** Ventana de 14 días desde `lastOnlineAuthAt` (§0.2). */
export function outboxWindow(lastOnlineAuthAt: number | null | undefined, now = Date.now()): WindowState {
  if (lastOnlineAuthAt == null) return { accepting: true, warn: false, deadline: now + OUTBOX_WINDOW_MS }
  const deadline = lastOnlineAuthAt + OUTBOX_WINDOW_MS
  const age = now - lastOnlineAuthAt
  return { accepting: age <= OUTBOX_WINDOW_MS, warn: age >= OUTBOX_WARN_MS, deadline }
}

/** Ops `inflight` huérfanas (pestaña cerrada a mitad, §6.2) vuelven a `retry`. */
export function isStaleInflight(op: OutboxOp, now: number): boolean {
  return op.status === "inflight" && now - op.updatedAt > INFLIGHT_STALE_MS
}
