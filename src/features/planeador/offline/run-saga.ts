/**
 * Ejecución de una saga del planeador (Fase 3). Online-first (D-F2-7): con
 * red, los pasos se envían en orden desde la pantalla, cada uno con la
 * `Idempotency-Key` fija de su paso; si la red se cae a mitad (o ya no había
 * red, o la entidad tiene otra saga en cola) lo que falta se encola con las
 * MISMAS claves y el mapa de ids temporales ya cargado, así que la outbox
 * retoma exactamente donde quedó. Sin outbox habilitada (no piloto, equipo
 * compartido, kill-switch) es el envío directo de siempre.
 */
import { isNetworkError } from "@/lib/network-error"
import { queryClient } from "@/lib/query-client"
import { connectivityStore } from "@/lib/offline/connectivity"
import { isOutboxEnabled } from "@/lib/offline/outbox/engine"
import { getOutboxHandler } from "@/lib/offline/outbox/registry"
import { enqueueSaga, openSagaOpsFor, type SagaInput, type SagaMeta } from "@/lib/offline/outbox/saga"
import { outboxStore } from "@/lib/offline/outbox/store"
import type { SendCtx } from "@/lib/offline/outbox/types"

export interface StepOutcome {
  index: number
  kind: string
  label: string
  ok: boolean
  result?: unknown
  error?: unknown
}

export interface SagaRunResult {
  /** `true` si todo o parte quedó en la outbox. */
  queued: boolean
  /** Índice del primer paso encolado (0 = toda la saga). */
  queuedFrom: number | null
  outcomes: StepOutcome[]
}

export interface RunSagaOptions {
  /**
   * Crear sigue con los pasos siguientes aunque uno falle (la actividad ya
   * existe; los fallos se informan juntos); editar se detiene en el primero.
   * El paso 0 siempre detiene: sin él no hay a qué colgar el resto.
   */
  continueOnError: boolean
}

function directCtx(sagaId: string, index: number, files: Record<string, File> | undefined): SendCtx {
  return {
    idempotencyKey: `saga:${sagaId}:${index}`,
    background: false,
    resolveFile: () => Promise.reject(new Error("No disponible en el envío directo")),
    async getFile(key) {
      const file = files?.[key]
      if (!file) throw new Error(`Archivo ${key} no disponible`)
      return file
    },
  }
}

export function debeEncolar(target: string): boolean {
  if (!isOutboxEnabled()) return false
  return connectivityStore.getState().status === "offline" || openSagaOpsFor(outboxStore.getOps(), target).length > 0
}

export async function runSaga(input: SagaInput & { sagaId: string }, options: RunSagaOptions): Promise<SagaRunResult> {
  if (debeEncolar(input.target)) {
    await enqueueSaga(input)
    return { queued: true, queuedFrom: 0, outcomes: [] }
  }
  const outcomes: StepOutcome[] = []
  for (const [index, step] of input.steps.entries()) {
    // Un hermano (criterio) cuyo padre falló no se intenta.
    const deps = step.after ?? (index === 0 ? [] : [index - 1])
    if (deps.some((d) => outcomes[d] && !outcomes[d].ok)) {
      outcomes.push({ index, kind: step.kind, label: step.label, ok: false, error: new Error("Depende de un paso que falló.") })
      continue
    }
    const handler = getOutboxHandler(step.kind)
    if (!handler) throw new Error(`Handler de outbox no registrado: ${step.kind}`)
    const saga: SagaMeta = {
      id: input.sagaId,
      target: input.target,
      titulo: input.titulo,
      label: step.label,
      step: index,
      total: input.steps.length,
    }
    try {
      const result = await handler.send({ ...step.payload, saga } as never, directCtx(input.sagaId, index, step.files))
      outcomes.push({ index, kind: step.kind, label: step.label, ok: true, result })
    } catch (error) {
      if (isNetworkError(error) && isOutboxEnabled()) {
        await enqueueSaga({ ...input, firstStep: index })
        invalidar()
        return { queued: true, queuedFrom: index, outcomes }
      }
      outcomes.push({ index, kind: step.kind, label: step.label, ok: false, error })
      if (index === 0 || !options.continueOnError) break
    }
  }
  invalidar()
  return { queued: false, queuedFrom: null, outcomes }
}

function invalidar() {
  // Mismas keys que invalidan los handlers al sincronizar.
  for (const key of getOutboxHandler("planeador.actividad.crear")?.invalidates(undefined as never) ?? []) {
    void queryClient.invalidateQueries({ queryKey: key })
  }
}

