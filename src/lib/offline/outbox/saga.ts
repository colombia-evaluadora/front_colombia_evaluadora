/**
 * Sagas de la outbox (Fase 3, `docs/offline/PLAN-offline.md` §6.5–6.8): un
 * guardado multi-paso (crear/editar actividad, crear/editar unidad) se encola
 * como ops encadenadas por `dependsOn`, cada una con su `Idempotency-Key`
 * FIJA (`saga:<id>:<paso>`), para que se reanude tras cerrar el navegador sin
 * repetir pasos ya hechos.
 *
 * Sin dependencias de features: los pasos los registra cada feature como
 * handlers normales (`registry.ts`); acá solo vive la mecánica común —
 * metadatos del paso dentro del payload, mapa de ids temporales, estado
 * agregado de la saga y las acciones de la UI ("Omitir paso", "Descartar").
 */
import { outboxHeaders } from "@/lib/offline/outbox/headers"
import { getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"
import { enqueue, scheduleSync } from "@/lib/offline/outbox/engine"
import { isOpen } from "@/lib/offline/outbox/policy"
import { deleteOps, getOutboxUser, logEvent, outboxStore, patchOp } from "@/lib/offline/outbox/store"
import { isTmpId, type TmpId } from "@/lib/offline/outbox/tmp-id"
import type { OutboxOp, OutboxStatus, SendCtx } from "@/lib/offline/outbox/types"
import type { StepFiles, WriteRequest } from "@/lib/offline/outbox/write-request"

// ---- Metadatos -----------------------------------------------------------------

export interface SagaMeta {
  id: string
  /** Entidad que la saga crea/modifica (`actividad:12`, `actividad:tmp:…`, `unidad:3`). */
  target: string
  titulo: string
  /** Etiqueta del paso ("Materiales de apoyo"). */
  label: string
  step: number
  total: number
}

export interface SagaPayload {
  saga: SagaMeta
}

export function sagaOf(op: Pick<OutboxOp, "payload">): SagaMeta | null {
  const saga = (op.payload as Partial<SagaPayload> | null)?.saga
  return saga && typeof saga.id === "string" ? saga : null
}

// ---- Mapa de ids temporales (persistido en `meta`) -----------------------------

let idmap: Record<string, number> = {}
let idmapUser: string | null = null
let loading: Promise<void> | null = null

const metaKey = (user: string) => `outbox-idmap:${user}`

async function ensureIdmap(): Promise<void> {
  const user = getOutboxUser()
  if (idmapUser === user) return
  if (!loading) {
    loading = (async () => {
      const stored = user && isIndexedDbAvailable() ? await getMeta<Record<string, number>>(metaKey(user)).catch(() => undefined) : undefined
      idmap = stored ?? {}
      idmapUser = user
    })().finally(() => {
      loading = null
    })
  }
  await loading
}

/** Id real ya conocido de un `tmp:` (o de un archivo subido), si existe. */
export async function getMappedId(key: string): Promise<number | undefined> {
  await ensureIdmap()
  return idmap[key]
}

export async function setMappedId(key: string, id: number): Promise<void> {
  await ensureIdmap()
  idmap = { ...idmap, [key]: id }
  const user = idmapUser
  if (user && isIndexedDbAvailable()) await setMeta(metaKey(user), idmap)
}

/** Lectura síncrona para la UI (redirigir de una ruta `tmp:` al id real). */
export function peekMappedId(key: string): number | undefined {
  return idmapUser === getOutboxUser() ? idmap[key] : undefined
}

export class SagaParentMissingError extends Error {
  constructor() {
    super("El paso anterior de este guardado todavía no llegó al servidor.")
    this.name = "SagaParentMissingError"
  }
}

/** Número real: el mismo si ya lo era; el mapeado si es `tmp:` (tira si aún no hay). */
export async function resolveId(value: number | TmpId | string): Promise<number> {
  if (typeof value === "number") return value
  if (isTmpId(value)) {
    const mapped = await getMappedId(value)
    if (mapped == null) throw new SagaParentMissingError()
    return mapped
  }
  const n = Number(value)
  if (!Number.isFinite(n)) throw new SagaParentMissingError()
  return n
}

// ---- Request de un paso ----------------------------------------------------------

/** `WriteRequest` de un paso: su clave fija, sin toasts y sus archivos (subidos una vez). */
export function stepRequest(ctx: SendCtx): WriteRequest {
  const files: StepFiles = {
    get: (key) => ctx.getFile(key),
    async memo(key, upload) {
      const mapKey = `file:${ctx.idempotencyKey}:${key}`
      const known = await getMappedId(mapKey)
      if (known != null) return known
      const id = await upload()
      await setMappedId(mapKey, id)
      return id
    },
  }
  return { headers: outboxHeaders(ctx), background: ctx.background, files }
}

// ---- Encolado --------------------------------------------------------------------

export interface SagaStepInput {
  kind: string
  label: string
  payload: Record<string, unknown>
  files?: Record<string, File>
  /**
   * Índices de pasos de los que depende. Por defecto, el anterior (cadena
   * lineal = orden real del código). Los criterios usan `[0]`: son hermanos
   * que solo necesitan la actividad creada (equivalente al `allSettled`).
   */
  after?: number[]
}

export interface SagaInput {
  /** Id fijo (el envío online ya usó `saga:<id>:<paso>` como clave). */
  sagaId?: string
  /** Encola desde este paso: los anteriores ya se hicieron online. */
  firstStep?: number
  target: string
  titulo: string
  steps: SagaStepInput[]
}

/** Ops abiertas de sagas sobre la misma entidad (FIFO entre guardados sucesivos). */
export function openSagaOpsFor(ops: OutboxOp[], target: string): OutboxOp[] {
  return ops.filter((o) => isOpen(o) && sagaOf(o)?.target === target)
}

export async function enqueueSaga(input: SagaInput): Promise<{ sagaId: string; ops: OutboxOp[] }> {
  const sagaId = input.sagaId ?? crypto.randomUUID()
  const first = input.firstStep ?? 0
  const previas = openSagaOpsFor(outboxStore.getOps(), input.target)
  const ops: OutboxOp[] = []
  const porPaso = new Map<number, OutboxOp>()
  try {
    for (const [index, step] of input.steps.entries()) {
      if (index < first) continue
      const deps =
        index === first
          ? previas.map((o) => o.id)
          : (step.after ?? [index - 1])
              .map((i) => porPaso.get(i)?.id)
              .filter((id): id is string => Boolean(id))
      const saga: SagaMeta = {
        id: sagaId,
        target: input.target,
        titulo: input.titulo,
        label: step.label,
        step: index,
        total: input.steps.length,
      }
      const op = await enqueue(step.kind, { ...step.payload, saga }, {
        dependsOn: deps,
        files: step.files,
        idempotencyKey: `saga:${sagaId}:${index}`,
      })
      ops.push(op)
      porPaso.set(index, op)
    }
  } catch (error) {
    // Cuota/archivo: no se deja media saga en la cola.
    await deleteOps(ops.map((o) => o.id))
    throw error
  }
  await logEvent({ level: "info", event: "saga:enqueue", data: { sagaId, target: input.target, steps: ops.length } })
  return { sagaId, ops }
}

// ---- Vista agregada ---------------------------------------------------------------

export type SagaStatus = "pending" | "syncing" | "partial" | "conflict" | "rejected" | "done"

export interface SagaView {
  id: string
  target: string
  titulo: string
  createdAt: number
  steps: OutboxOp[]
  status: SagaStatus
  /** Primer paso con problema (para "Reintentar desde aquí"). */
  failedStep: OutboxOp | null
}

export function sagaStatus(steps: Pick<OutboxOp, "status">[]): SagaStatus {
  const has = (s: OutboxStatus) => steps.some((o) => o.status === s)
  if (steps.every((o) => o.status === "done")) return "done"
  if (has("conflict")) return "conflict"
  if (has("rejected") || has("blocked")) return steps.some((o) => o.status === "done") ? "partial" : "rejected"
  if (has("inflight")) return "syncing"
  return steps.some((o) => o.status === "done") ? "syncing" : "pending"
}

export function groupSagas(ops: OutboxOp[]): SagaView[] {
  const byId = new Map<string, OutboxOp[]>()
  for (const op of ops) {
    const saga = sagaOf(op)
    if (!saga) continue
    byId.set(saga.id, [...(byId.get(saga.id) ?? []), op])
  }
  return [...byId.values()]
    .map((steps) => {
      const sorted = [...steps].sort((a, b) => (sagaOf(a)?.step ?? 0) - (sagaOf(b)?.step ?? 0))
      const meta = sagaOf(sorted[0]) as SagaMeta
      return {
        id: meta.id,
        target: meta.target,
        titulo: meta.titulo,
        createdAt: Math.min(...sorted.map((o) => o.createdAt)),
        steps: sorted,
        status: sagaStatus(sorted),
        failedStep: sorted.find((o) => o.status === "rejected" || o.status === "conflict") ?? null,
      }
    })
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Estado de la saga más relevante abierta sobre `target` (badge de la card). */
export function sagaStatusFor(ops: OutboxOp[], target: string): SagaStatus | null {
  const sagas = groupSagas(ops).filter((s) => s.target === target && s.status !== "done")
  if (sagas.length === 0) return null
  const order: SagaStatus[] = ["conflict", "rejected", "partial", "syncing", "pending"]
  return order.find((s) => sagas.some((v) => v.status === s)) ?? "pending"
}

// ---- Acciones de la UI ----------------------------------------------------------------

/**
 * "Omitir este paso": lo da por resuelto sin enviarlo para que sigan los
 * siguientes (p. ej. materiales rechazados por un archivo dañado no frenan
 * el instrumento). Los `blocked` que dependían de él vuelven a `retry`.
 */
export async function skipSagaStep(opId: string): Promise<void> {
  await patchOp(opId, { status: "done", resultNote: "Paso omitido por el docente.", lastError: null, conflict: null })
  for (const op of outboxStore.getOps().filter((o) => o.status === "blocked" && o.dependsOn.includes(opId))) {
    await patchOp(op.id, { status: "retry", lastError: null, nextAttemptAt: Date.now() })
  }
  await logEvent({ level: "info", event: "saga:skip", opId })
  scheduleSync(0)
}

/** "Reintentar desde este paso": él y sus bloqueados vuelven a la cola. */
export async function retrySagaFrom(opId: string): Promise<void> {
  const sagaId = sagaOf(outboxStore.getOps().find((o) => o.id === opId) ?? { payload: null })?.id
  for (const op of outboxStore.getOps()) {
    if (op.id === opId || (sagaOf(op)?.id === sagaId && op.status === "blocked")) {
      await patchOp(op.id, { status: "retry", lastError: null, nextAttemptAt: Date.now() })
    }
  }
  scheduleSync(0)
}

/** Descarta todos los pasos no enviados de la saga (lo ya hecho en el servidor queda). */
export async function discardSaga(sagaId: string): Promise<void> {
  const ids = outboxStore
    .getOps()
    .filter((o) => sagaOf(o)?.id === sagaId && o.status !== "done" && o.status !== "inflight")
    .map((o) => o.id)
  await deleteOps(ids)
  await logEvent({ level: "info", event: "saga:discard", data: { sagaId, steps: ids.length } })
}

/** Solo tests. */
export function __resetSagaForTests() {
  idmap = {}
  idmapUser = null
  loading = null
}
