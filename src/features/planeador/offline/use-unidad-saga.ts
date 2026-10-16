import { useState } from "react"

import type { UnidadInfoGeneral, UpdateUnidadInput } from "@/features/planeador/api/mutations/update-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { buildCrearUnidadSaga, buildEditarUnidadSaga } from "@/features/planeador/offline/build-sagas"
import { runSaga, type SagaRunResult } from "@/features/planeador/offline/run-saga"
import { mensajeErrorSaga } from "@/features/planeador/offline/saga-messages"

interface Callbacks<R> {
  onSuccess: (result: R) => void
  onError: (mensaje: string, error: unknown) => void
  /** Quedó en la outbox (sin red): el llamador avisa y navega como si fuera éxito. */
  onQueued: () => void
}

async function ejecutar<R>(build: () => Parameters<typeof runSaga>[0], cb: Callbacks<R>) {
  let run: SagaRunResult
  try {
    run = await runSaga(build(), { continueOnError: false })
  } catch (error) {
    cb.onError(mensajeErrorSaga(error), error)
    return
  }
  if (run.queued) return cb.onQueued()
  const [paso] = run.outcomes
  if (!paso?.ok) return cb.onError(mensajeErrorSaga(paso?.error), paso?.error)
  cb.onSuccess(paso.result as R)
}

/**
 * Crear unidad como saga de un paso (Fase 3): misma forma `{ mutate,
 * isPending }` que `useCreateUnidad`, pero online-first con outbox.
 */
export function useCrearUnidadSaga(cb: Callbacks<{ id: number }>) {
  const [isPending, setPending] = useState(false)
  return {
    isPending,
    mutate(data: UnidadInfoGeneral) {
      setPending(true)
      void ejecutar(() => buildCrearUnidadSaga(data), cb).finally(() => setPending(false))
    },
  }
}

interface EditarUnidadResult {
  status: "ok" | "error"
  message?: string
  actividadesAfectadas: { pk: number; titulo: string }[]
}

/** Editar unidad: la edición encolada verifica al sincronizar que la unidad no cambió (D-F3-4). */
export function useEditarUnidadSaga(unidad: UnidadTematica | undefined, cb: Callbacks<EditarUnidadResult>) {
  const [isPending, setPending] = useState(false)
  return {
    isPending,
    mutate({ data }: UpdateUnidadInput) {
      if (!unidad) return
      setPending(true)
      void ejecutar(() => buildEditarUnidadSaga(unidad, data), cb).finally(() => setPending(false))
    },
  }
}
