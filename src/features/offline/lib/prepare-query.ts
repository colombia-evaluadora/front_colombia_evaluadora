/**
 * Cómo "Preparar" baja UNA query sin rehacer lo que no cambió
 * (`add-offline-preparar-incremental`):
 *
 * 1. **Fresca** (dentro de su ventana, `prepare-freshness.ts`): se usa lo que
 *    hay en el equipo. Cero requests, cero escrituras.
 * 2. **Sondeo**: si la query tiene validadores (las lecturas con ETag que la
 *    dieron), se repiten con `If-None-Match`. Todo 304 → no se baja ni se
 *    reescribe: solo se anota "verificado a las…".
 * 3. **Descarga**: la `queryFn` de la pantalla, como siempre, grabando sus
 *    lecturas para la próxima vez. Si el dato llega igual, el persister
 *    tampoco lo reescribe.
 *
 * "Forzar todo" (`force`) salta 1 y 2.
 */
import { hashKey, type QueryClient, type QueryKey } from "@tanstack/react-query"

import type { PrepareContext } from "@/features/offline/lib/prepare-engine"
import { prepareFreshFor } from "@/features/offline/lib/prepare-freshness"
import { beginRecording, endRecording, probeValidators } from "@/lib/offline/conditional-requests"
import {
  getQueryValidators,
  getVerifiedAt,
  markVerified,
  setQueryValidators,
  type OfflineQueryMeta,
} from "@/lib/offline/query-persister"

export type PrepareDecision = "fresh" | "probe" | "fetch"

/** Qué hacer con una query (función pura sobre el cache; testeable). */
export function decidePrepare(
  queryClient: QueryClient,
  ctx: Pick<PrepareContext, "force" | "staleTime">,
  queryKey: QueryKey,
  meta: OfflineQueryMeta | undefined,
  now: number = Date.now(),
): PrepareDecision {
  if (ctx.force) return "fetch"
  const state = queryClient.getQueryState(queryKey)
  if (!state || state.data === undefined || state.status !== "success") return "fetch"
  const hash = hashKey(queryKey)
  const window = Math.max(ctx.staleTime, prepareFreshFor(queryKey, meta))
  const last = Math.max(state.dataUpdatedAt, getVerifiedAt(hash) ?? 0)
  // Invalidada (el docente guardó algo que la toca): ni fresca ni sondeo; se
  // baja (un sondeo lanzado antes de que la escritura llegue al servidor
  // podría confirmar el dato viejo).
  if (state.isInvalidated) return "fetch"
  if (window > 0 && now - last < window) return "fresh"
  // Ya la está pidiendo la pantalla: se espera esa descarga.
  if (state.fetchStatus === "fetching") return "fetch"
  return getQueryValidators(hash, state.data)?.length ? "probe" : "fetch"
}

export interface PrepareQueryInput<T> {
  queryKey: QueryKey
  meta?: OfflineQueryMeta
  /** Baja la query (con la `queryFn` de la pantalla) y devuelve el dato. */
  fetch: () => Promise<T>
}

export async function prepareQuery<T>(
  queryClient: QueryClient,
  ctx: PrepareContext,
  { queryKey, meta, fetch }: PrepareQueryInput<T>,
): Promise<T> {
  const hash = hashKey(queryKey)
  // Otra tarea de esta misma corrida ya la resolvió (la misma key aparece en
  // dos secciones, o ya estaba abierta en la sesión): no se repite.
  const repetida = ctx.seen.has(hash) && queryClient.getQueryData(queryKey) !== undefined
  const decision = repetida ? "fresh" : decidePrepare(queryClient, ctx, queryKey, meta)
  if (decision === "fresh") {
    ctx.counters.fresh++
    return queryClient.getQueryData(queryKey) as T
  }
  if (decision === "probe") {
    // El motor pudo haber lanzado el sondeo antes (en paralelo con las tareas
    // anteriores); si no, se sondea ahora.
    const pending = ctx.probes.get(hash)
    ctx.probes.delete(hash)
    const before = queryClient.getQueryData(queryKey)
    const verdict = await (pending ?? probeValidators(getQueryValidators(hash, before) ?? []))
    const state = queryClient.getQueryState(queryKey)
    const data = state?.data as T | undefined
    // Mientras se sondeaba, el dato pudo cambiar en memoria o invalidarse (el
    // docente guardó): el veredicto ya no vale y se baja.
    const vigente = data !== undefined && !state?.isInvalidated && getQueryValidators(hash, data) !== undefined
    if (verdict === "unchanged" && vigente) {
      const now = Date.now()
      // Misma referencia: TanStack la marca fresca y el persister ve que no
      // cambió (no cifra ni escribe la fila).
      queryClient.setQueryData(queryKey, data, { updatedAt: now })
      markVerified(hash, now)
      ctx.counters.notModified++
      ctx.seen.add(hash)
      return data
    }
  }
  // Si la pantalla ya la estaba pidiendo, sus lecturas arrancaron antes de
  // grabar: los validadores quedarían incompletos y no se guardan.
  const enCurso = queryClient.getQueryState(queryKey)?.fetchStatus === "fetching"
  const recording = beginRecording()
  let ok = false
  try {
    const data = await fetch()
    ok = true
    ctx.counters.fetched++
    ctx.seen.add(hash)
    return data
  } finally {
    const recorded = endRecording(recording)
    if (ok) setQueryValidators(hash, enCurso ? null : recorded, queryClient.getQueryCache().get(hash))
  }
}
