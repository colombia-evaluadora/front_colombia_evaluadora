/**
 * Modo offline efectivo (kill-switch, plan §11.6).
 *
 * Fuentes, de menor a mayor prioridad:
 *   1. `VITE_APP_OFFLINE` (build): `off | read | full`, default `read`.
 *   2. Flag remoto `GET /api/eval-col/config/offline` → `{ mode }`, consultado
 *      al arrancar online. Solo puede BAJAR el modo (`full` → `read` → `off`):
 *      un backend mal configurado no puede encender lo que el build apagó.
 *
 * Falla seguro: si el endpoint no existe (404 — hoy no hay backend), no
 * responde o devuelve algo inválido, se queda el valor del build.
 *
 * TODO(Fase 1, persistencia): guardar el valor en `meta.killSwitch` de
 * `lib/offline/db.ts` para respetarlo también al arrancar sin red.
 */
import { env } from "@/config/env"

export type OfflineMode = "off" | "read" | "full"

const RANK: Record<OfflineMode, number> = { off: 0, read: 1, full: 2 }
const REMOTE_FLAG_URL = `${env.API_URL}/eval-col/config/offline`

let current: OfflineMode = env.OFFLINE

export function getOfflineMode(): OfflineMode {
  return current
}

function isOfflineMode(value: unknown): value is OfflineMode {
  return value === "off" || value === "read" || value === "full"
}

/** Aplica el flag remoto (si lo hay) y devuelve el modo efectivo. Nunca tira. */
export async function resolveOfflineMode(timeoutMs = 3000): Promise<OfflineMode> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return current
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // `fetch` directo (no axios): un 404 acá es esperado y no debe disparar el
    // toast global ni contar como falla de conectividad.
    const response = await fetch(REMOTE_FLAG_URL, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    })
    if (!response.ok) return current
    const body: unknown = await response.json()
    const raw = (body as { mode?: unknown; MODE?: unknown } | null) ?? {}
    const remote = raw.mode ?? raw.MODE
    if (isOfflineMode(remote) && RANK[remote] < RANK[current]) current = remote
  } catch {
    // Sin endpoint, sin red o JSON inválido: se queda el valor del build.
  } finally {
    clearTimeout(timer)
  }
  return current
}
