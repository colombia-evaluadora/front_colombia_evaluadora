/**
 * Tipos de la outbox (Fase 2, `docs/offline/PLAN-offline.md` §4.1, §5.1, §6).
 *
 * Sin dependencias de features (tarea 7.1): los handlers se registran desde
 * afuera (`registry.ts`) y el payload es opaco para la infraestructura.
 */
import type { QueryClient } from "@tanstack/react-query"

export type OutboxStatus =
  | "pending"
  | "inflight"
  | "retry"
  | "conflict"
  | "rejected"
  /** Depende de una op `rejected`/descartada: no se envía hasta resolverla. */
  | "blocked"
  | "done"

export type ErrorClass = "retry" | "auth" | "conflict" | "rejected" | "fatal"

export interface OutboxError {
  /** Código estable del backend (BE-8) o interno (`network`, `server`, `http-4xx`…). */
  code: string
  status?: number
  message: string
}

/** Dato del servidor que chocó con el cambio local (409 de CAS). */
export interface OutboxConflict {
  /** Valor actual en el servidor tal como lo devolvió el 409 (opaco). */
  server: unknown
  /** Versión del servidor (`updated_at`) para reenviar con "Conservar el mío". */
  serverVersion?: string | null
  /** Para asistencia: conflicto por estudiante (fkMatricula → valor servidor). */
  rows?: { key: string; label?: string; local: unknown; server: unknown; serverVersion?: string | null }[]
}

export interface OutboxOp<P = unknown> {
  id: string
  /** Orden global de encolado (FIFO por `entityKey`). */
  seq: number
  userSub: string
  kind: string
  handlerVersion: number
  entityKey: string
  dependsOn: string[]
  payload: P
  /** Ids en el store `blobs` (archivos copiados al encolar). */
  blobRefs: string[]
  idempotencyKey: string
  status: OutboxStatus
  attempts: number
  nextAttemptAt: number
  lastError: OutboxError | null
  conflict: OutboxConflict | null
  /** Resultado que el handler quiere mostrar (p. ej. "quedó como solicitud"). */
  resultNote: string | null
  createdAt: number
  updatedAt: number
  appBuild: string
}

export interface SendCtx {
  idempotencyKey: string
  /** `true` cuando la envía el procesador de la cola (sin toasts globales). */
  background: boolean
  /**
   * Resuelve un archivo referenciado en el payload por su clave (`fileKey`)
   * a su `pk_tarchivo`: lo sube (una sola vez; un reintento reutiliza el id).
   */
  resolveFile: (fileKey: string) => Promise<number>
}

export interface ClassifiedError {
  kind: ErrorClass
  error: OutboxError
  conflict?: OutboxConflict
  /** 429: `Retry-After` en ms. */
  retryAfterMs?: number
}

export interface OutboxDescription {
  titulo: string
  detalle: string
  ruta?: string
}

export interface OutboxHandler<P = unknown> {
  kind: string
  /** Versión del payload: si una op guardada tiene otra, se rechaza visible. */
  version: number
  entityKey: (payload: P) => string
  /**
   * Fusión con una op pendiente (no `inflight`) de la misma `entityKey`.
   * Devuelve el payload fusionado o `null` para no fusionar (§6.7).
   */
  coalesce?: (prev: P, next: P) => P | null
  send: (payload: P, ctx: SendCtx) => Promise<unknown>
  /** Nota para el resumen a partir del resultado (p. ej. regla 75 → solicitud). */
  noteOf?: (result: unknown) => string | null
  /** Clasificación propia (p. ej. 409 de contexto = rejected); si devuelve `null` usa la por defecto. */
  classify?: (error: unknown) => ClassifiedError | null
  /** Keys a invalidar al terminar el lote (deduplicadas, §6.9). */
  invalidates: (payload: P) => readonly (readonly unknown[])[]
  /** Superpone el cambio sobre el cache (re-aplicable tras recargar). */
  applyOptimistic?: (queryClient: QueryClient, payload: P) => void
  /** "Conservar el mío": payload a reenviar sobre la versión del servidor. */
  rebase?: (payload: P, conflict: OutboxConflict) => P
  /** Sube un archivo de la op; devuelve `pk_tarchivo`. */
  upload?: (file: File, background: boolean) => Promise<number>
  describe: (payload: P) => OutboxDescription
}

export interface OutboxSummary {
  pending: number
  inflight: number
  conflict: number
  rejected: number
  blocked: number
  done: number
  /** Ops no terminadas (todo menos `done`). */
  total: number
  syncing: boolean
  /** Progreso del lote actual. */
  batchDone: number
  batchTotal: number
  /** El refresh previo al envío dio 401: requiere iniciar sesión. */
  needsLogin: boolean
}

export const EMPTY_SUMMARY: OutboxSummary = {
  pending: 0,
  inflight: 0,
  conflict: 0,
  rejected: 0,
  blocked: 0,
  done: 0,
  total: 0,
  syncing: false,
  batchDone: 0,
  batchTotal: 0,
  needsLogin: false,
}
