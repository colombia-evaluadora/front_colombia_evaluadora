/**
 * Desfase del reloj del equipo respecto del servidor (BE-7: el gateway manda
 * `X-Server-Time` en cada respuesta). La outbox lo deja en su registro
 * exportable al encolar, para que soporte vea un reloj del equipo mal puesto.
 */
let skewMs = 0

/** Desfase máximo que se considera normal (latencia, redondeos). */
export const CLOCK_SKEW_WARN_MS = 5 * 60_000

export function noteServerTime(header: string | null | undefined, now = Date.now()): void {
  if (!header) return
  const server = Date.parse(header)
  if (Number.isNaN(server)) return
  skewMs = server - now
}

/** Hora estimada del servidor (`Date.now()` corregido por el último desfase visto). */
export function serverNow(): number {
  return Date.now() + skewMs
}

export function getClockSkewMs(): number {
  return skewMs
}

/** Solo tests. */
export function __resetClockForTests() {
  skewMs = 0
}
