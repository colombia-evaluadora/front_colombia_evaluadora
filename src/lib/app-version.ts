/**
 * Versión del build (`AAAA.MM.DD-sha`, la fija `vite.config.ts`). Viaja como
 * `X-Client-Version` y se compara con `X-Min-Client-Version` del gateway
 * (`openspec/changes/add-offline-meses-pwa` D-7): un equipo que vuelve tras
 * meses sin red primero sube lo pendiente y después se le pide actualizar.
 */
declare const __APP_VERSION__: string

export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0000.00.00-dev"

/** Prefijo de fecha comparable (`AAAA.MM.DD`), o `null` si no tiene esa forma. */
function datePart(version: string): string | null {
  const match = /^(\d{4}\.\d{2}\.\d{2})/.exec(version.trim())
  return match ? match[1] : null
}

/** `true` si `current` es anterior al mínimo. Un mínimo ilegible nunca obliga. */
export function isBelowMinVersion(current: string, minimum: string | null | undefined): boolean {
  if (!minimum) return false
  const min = datePart(minimum)
  const cur = datePart(current)
  if (!min || !cur) return false
  return cur < min
}

let minVersion: string | null = null
const listeners = new Set<() => void>()

/** Lo llama el interceptor de respuesta de axios con `X-Min-Client-Version`. */
export function noteMinClientVersion(value: string | null | undefined) {
  const next = value?.trim() || null
  if (next === minVersion) return
  minVersion = next
  listeners.forEach((l) => l())
}

export const updateRequiredStore = {
  get: () => isBelowMinVersion(APP_VERSION, minVersion),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
