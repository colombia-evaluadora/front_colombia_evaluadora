/**
 * Modo offline efectivo (kill-switch, plan §11.6).
 *
 * Fuentes, de menor a mayor prioridad:
 *   1. `VITE_APP_OFFLINE` (build): `off | read | full`, default `read`.
 *   2. Flag remoto `GET /api/eval-col/config/offline` → `{ mode }`, consultado
 *      al arrancar online. Solo puede BAJAR el modo (`full` → `read` → `off`):
 *      un backend mal configurado no puede encender lo que el build apagó.
 *
 * El último valor remoto conocido se guarda en `meta.killSwitch`
 * (`lib/offline/db.ts`) para que un arranque SIN red respete el último
 * apagado remoto. Falla seguro:
 *   - 404 / respuesta no OK: no hay flag remoto → se borra el guardado y vale
 *     el build (hoy el endpoint no existe).
 *   - sin red, timeout o JSON inválido: se usa el último valor guardado.
 *   - IndexedDB no disponible: solo el build y la respuesta en vivo.
 */
import { env } from "@/config/env"
import { deleteMeta, getMeta, isIndexedDbAvailable, setMeta } from "@/lib/offline/db"

export type OfflineMode = "off" | "read" | "full"

const RANK: Record<OfflineMode, number> = { off: 0, read: 1, full: 2 }
const REMOTE_FLAG_URL = `${env.API_URL}/eval-col/config/offline`
const META_KEY = "killSwitch"

let current: OfflineMode = env.OFFLINE

export function getOfflineMode(): OfflineMode {
  return current
}

function isOfflineMode(value: unknown): value is OfflineMode {
  return value === "off" || value === "read" || value === "full"
}

/** El más restrictivo entre el build y el remoto. */
function lower(remote: OfflineMode | undefined): OfflineMode {
  return remote && RANK[remote] < RANK[env.OFFLINE] ? remote : env.OFFLINE
}

async function readStored(): Promise<OfflineMode | undefined> {
  if (!isIndexedDbAvailable()) return undefined
  try {
    const value = await getMeta<unknown>(META_KEY)
    return isOfflineMode(value) ? value : undefined
  } catch {
    return undefined
  }
}

async function store(mode: OfflineMode | undefined) {
  if (!isIndexedDbAvailable()) return
  try {
    if (mode) await setMeta(META_KEY, mode)
    else await deleteMeta(META_KEY)
  } catch {
    // Sin IndexedDB utilizable: el valor vale solo para esta carga.
  }
}

/** Aplica el flag remoto (o el último conocido) y devuelve el modo efectivo. Nunca tira. */
export async function resolveOfflineMode(timeoutMs = 3000): Promise<OfflineMode> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    current = lower(await readStored())
    return current
  }
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
    if (!response.ok) {
      // 404 = no hay flag remoto. Un 5xx no dice nada: se conserva lo guardado.
      if (response.status === 404) {
        await store(undefined)
        current = env.OFFLINE
      } else {
        current = lower(await readStored())
      }
      return current
    }
    const body = ((await response.json()) ?? {}) as { mode?: unknown; MODE?: unknown }
    const remote = body.mode ?? body.MODE
    if (isOfflineMode(remote)) {
      await store(remote)
      current = lower(remote)
    } else {
      current = lower(await readStored())
    }
  } catch {
    // Sin red, timeout o JSON inválido: último valor conocido.
    current = lower(await readStored())
  } finally {
    clearTimeout(timer)
  }
  return current
}
