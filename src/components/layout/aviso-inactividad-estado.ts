/** Regla 27: la sesión se cierra tras 30 minutos sin actividad, con aviso 2 minutos antes. */
export const INACTIVIDAD_MS = 30 * 60 * 1000
export const AVISO_MS = 2 * 60 * 1000

/** La actividad de cualquier pestaña cuenta: se comparte por localStorage. */
export const CLAVE_ACTIVIDAD = "ce:ultima-actividad"
/**
 * Marca que deja la pestaña que cerró la sesión por inactividad. Las demás la
 * ven por el evento `storage` y se van al login en vez de quedarse con el
 * aviso abierto sobre una sesión que ya no existe (el `POST /auth/logout`
 * revoca la familia y borra la cookie `sso_refresh` de TODAS las pestañas).
 */
export const CLAVE_CIERRE = "ce:sesion-cerrada"

export type FaseInactividad = "activo" | "aviso" | "expirado"

/** Fase según el tiempo sin actividad y cuánto falta para el cierre. */
export function calcularFase(ahora: number, ultimaActividad: number): { fase: FaseInactividad; restanteMs: number } {
  const inactivo = Math.max(0, ahora - ultimaActividad)
  const restanteMs = Math.max(0, INACTIVIDAD_MS - inactivo)
  if (restanteMs === 0) return { fase: "expirado", restanteMs }
  if (restanteMs <= AVISO_MS) return { fase: "aviso", restanteMs }
  return { fase: "activo", restanteMs }
}

/** `m:ss` redondeando hacia arriba (no muestra 0:00 mientras queda tiempo). */
export function formatearCuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutos = Math.floor(total / 60)
  const segundos = total % 60
  return `${minutos}:${String(segundos).padStart(2, "0")}`
}

