/**
 * Autopreparación en segundo plano (`add-offline-meses-pwa`, D-14). Default
 * revisable: en un equipo PERSONAL, con red y la app quieta, "Preparar todo
 * el año" vuelve a correr solo, incremental, al entrar y cada pocas horas,
 * dentro de la cuota del equipo. En la app instalada además corre apenas
 * vuelve la red (D-12: "guardar todo"), y la primera vez prepara todo el año
 * mostrando el progreso.
 *
 * Incremental: cada tarea tiene su ventana de frescura (`prepare-freshness.ts`:
 * catálogos 1 día, datos de grupo 4 h, planilla y asistencia siempre pero con
 * `If-None-Match`); solo se baja (y se reescribe) lo que cambió.
 */
import type { QueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import {
  isPreparing,
  isStorageNearlyFull,
  prepareStore,
  type PrepareSnapshot,
} from "@/features/offline/lib/prepare-engine"
import { fetchPrepareOptions } from "@/features/offline/lib/prepare-tasks"
import { startPrepareJob } from "@/features/offline/lib/prepare-job"
import { hasAuthToken, isSessionEnded } from "@/lib/api-client"
import { connectivityStore } from "@/lib/offline/connectivity"
import { getOfflineMode } from "@/lib/offline/offline-mode"
import { isSyncing } from "@/lib/offline/outbox/engine"
import { getDeviceMode } from "@/lib/offline/query-persister"
import { isVaultLocked } from "@/lib/offline/vault"

/** Cada cuánto se vuelve a preparar con la app abierta (revisable). */
export const AUTO_PREPARE_INTERVAL_MS = 4 * 60 * 60 * 1000
/** Al volver la red en la app instalada, si lo último tiene más que esto. */
export const AUTO_PREPARE_RECONNECT_MIN_MS = 30 * 60 * 1000
/** Espera al entrar: primero carga la pantalla que el docente abrió. */
export const AUTO_PREPARE_FIRST_DELAY_MS = 5_000
/** Cada cuánto se revisa si ya toca (la corrida solo arranca si toca). */
export const AUTO_PREPARE_CHECK_MS = 10 * 60 * 1000

const PREF_KEY = "ce-offline-auto-prepare"

/** Preferencia del equipo ("Guardar datos automáticamente"), con el build como default. */
export function isAutoPrepareEnabled(): boolean {
  try {
    const value = localStorage.getItem(PREF_KEY)
    if (value === "on") return true
    if (value === "off") return false
  } catch {
    // Sin storage: vale el default del build.
  }
  return env.OFFLINE_AUTO_PREPARE !== "off"
}

export function setAutoPrepareEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, enabled ? "on" : "off")
  } catch {
    // Sin storage: la preferencia dura lo que la pestaña.
  }
}

export type AutoPrepareReason = "inicio" | "periodico" | "reconexion"

/** ¿Toca preparar? Función pura (testeable). */
export function autoPrepareDue({
  lastPrepareAt,
  now,
  reason,
}: {
  lastPrepareAt: number | null
  now: number
  reason: AutoPrepareReason
}): boolean {
  if (lastPrepareAt == null) return true
  const age = now - lastPrepareAt
  return age >= (reason === "reconexion" ? AUTO_PREPARE_RECONNECT_MIN_MS : AUTO_PREPARE_INTERVAL_MS)
}

/** Condiciones del equipo para correr sola (sin mirar el reloj). */
export function canAutoPrepare(): boolean {
  return (
    // Sin sesión válida (logout, vencida) no arranca: espera al próximo login.
    hasAuthToken() &&
    !isSessionEnded() &&
    getOfflineMode() !== "off" &&
    getDeviceMode() === "personal" &&
    isAutoPrepareEnabled() &&
    !isVaultLocked() &&
    // Con la red inestable (degradada) tampoco: se espera a que se asiente.
    connectivityStore.getState().status === "online" &&
    !isPreparing() &&
    !isSyncing() &&
    (typeof document === "undefined" || document.visibilityState !== "hidden")
  )
}

/**
 * Corre "Preparar todo el año" si toca. Nunca tira: la autopreparación es
 * un extra; si algo falla, la próxima revisión lo intenta de nuevo.
 */
export async function maybeAutoPrepare(
  queryClient: QueryClient,
  { roles, reason, now = Date.now() }: { roles: readonly string[]; reason: AutoPrepareReason; now?: number },
): Promise<PrepareSnapshot | null> {
  try {
    if (!canAutoPrepare()) return null
    const { lastPrepareAt } = prepareStore.getSnapshot()
    if (!autoPrepareDue({ lastPrepareAt, now, reason })) return null
    // Dentro de la cuota: con el almacenamiento casi lleno no se agrega más.
    if (await isStorageNearlyFull()) return null
    // Mismo trabajo de fondo que "Preparar" a mano (progreso y Cancelar en
    // el header). Si las opciones no cargan, la próxima revisión reintenta.
    const options = await fetchPrepareOptions(queryClient)
    return await startPrepareJob(queryClient, {
      roles,
      origin: "auto",
      options,
      resume: true,
    })
  } catch {
    return null
  }
}
