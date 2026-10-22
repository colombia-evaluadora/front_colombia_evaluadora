/**
 * "Preparar sin conexión" como trabajo en segundo plano: arma las tareas
 * (opciones del usuario → selección → tareas de `prepare-tasks.ts`) y lanza
 * el motor SIN esperar a que termine. El diálogo se puede cerrar enseguida;
 * el progreso, "Cancelar" y el aviso de fin viven en el header
 * (`OfflineDataStatus`). La autopreparación usa este mismo camino.
 */
import { hashKey, type QueryClient } from "@tanstack/react-query"

import { fullYearSelection, type PrepareSelection } from "@/components/offline/prepare-offline-plan"
import {
  isPreparing,
  prepareStore,
  runPrepare,
  type PrepareOrigin,
  type PrepareSnapshot,
} from "@/features/offline/lib/prepare-engine"
import {
  buildPrepareTasks,
  cachedOfflineTasks,
  fetchPrepareOptions,
  type PrepareTaskOptions,
} from "@/features/offline/lib/prepare-tasks"

export interface StartPrepareJobOptions {
  roles: readonly string[]
  origin: PrepareOrigin
  /** `undefined` = todo el año (todos los grupos, asignaturas y periodos). */
  selection?: PrepareSelection
  /** Si ya se cargaron (el diálogo las tiene); si no, se piden. */
  options?: PrepareTaskOptions
  incluirArchivos?: boolean
  resume?: boolean
  staleTime?: number
  /** "Forzar todo": ignora ventanas de frescura y sondeos (ETag). */
  force?: boolean
}

/**
 * Arranca (o se suma a) la preparación. Devuelve la promesa de la corrida,
 * pero los llamadores de la UI NO la esperan: es un trabajo de fondo. Si las
 * opciones no cargan, igual se preparan los catálogos y lo ya abierto.
 */
export async function startPrepareJob(
  queryClient: QueryClient,
  {
    roles,
    origin,
    selection,
    options,
    incluirArchivos = false,
    resume = false,
    staleTime,
    force = false,
  }: StartPrepareJobOptions,
): Promise<PrepareSnapshot> {
  if (isPreparing()) return prepareStore.getSnapshot()
  const opciones =
    options ??
    (await fetchPrepareOptions().catch(() => ({ grupos: [], asignaturas: [], periodos: [] })))
  const elegida =
    selection ?? fullYearSelection(opciones.grupos, opciones.asignaturas, opciones.periodos)
  const tasks = buildPrepareTasks(queryClient, {
    options: opciones,
    selection: elegida,
    incluirArchivos,
    roles,
  })
  const seeded = new Set(tasks.map((task) => hashKey(task.queryKey)))
  return runPrepare(queryClient, [...tasks, ...cachedOfflineTasks(queryClient, seeded)], {
    origin,
    resume,
    staleTime,
    force,
  })
}

/** Reintenta solo lo que falló en la última corrida de esta pestaña. */
export function retryFailedPrepare(queryClient: QueryClient): Promise<PrepareSnapshot> {
  const { failed } = prepareStore.getSnapshot()
  return runPrepare(queryClient, failed, { origin: "manual" })
}
