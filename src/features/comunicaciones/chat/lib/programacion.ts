// Mensajes programados: la hora se elige y se muestra en hora de Colombia
// (America/Bogota, UTC-5 sin horario de verano), sin importar la zona del equipo.
// comms-service recibe `yyyy-MM-ddTHH:mm` y lo lee como hora de Bogotá.

export const ZONA_PROGRAMADOS = "America/Bogota"
const DESFASE_BOGOTA = "-05:00"

// Mismos límites que comms-service: al menos 30 s en el futuro y como máximo un año.
export const MARGEN_MINIMO_MS = 30_000
export const MAXIMO_MS = 365 * 24 * 60 * 60 * 1000

const dos = (n: number) => String(n).padStart(2, "0")

/** Instante (ms) de una hora local de Bogotá `yyyy-MM-ddTHH:mm`; NaN si no es válida. */
export function bogotaAInstante(local: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return Number.NaN
  return Date.parse(`${local}:00${DESFASE_BOGOTA}`)
}

/** `yyyy-MM-ddTHH:mm` en hora de Bogotá de un instante (ISO o ms). */
export function instanteABogota(valor: string | number | Date): string {
  const ms = new Date(valor).getTime() - 5 * 60 * 60 * 1000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}T${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`
}

/**
 * El selector de fecha trabaja con `Date` en la zona del equipo: se toma su "hora de pared"
 * (año, mes, día, hora, minuto) como hora de Bogotá, y al revés para mostrar el valor.
 */
export function paredALocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
}

export function localAPared(local: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
}

/** Primer problema de la hora elegida, o null si comms-service la aceptará. */
export function errorProgramacion(
  local: string | null | undefined,
  ahora = Date.now(),
): string | null {
  if (!local) return "Elige la fecha y la hora de envío."
  const t = bogotaAInstante(local)
  if (Number.isNaN(t)) return "La fecha de envío no es válida."
  if (t < ahora + MARGEN_MINIMO_MS) return "Elige una hora posterior a la actual."
  if (t > ahora + MAXIMO_MS) return "Solo se puede programar hasta un año hacia adelante."
  return null
}

/** Sugerencia inicial: la próxima media hora con al menos 5 minutos de margen (hora de Bogotá). */
export function sugerenciaProgramacion(ahora = Date.now()): string {
  const media = 30 * 60 * 1000
  const siguiente = Math.ceil((ahora + 5 * 60 * 1000) / media) * media
  return instanteABogota(siguiente)
}

const FORMATO = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA_PROGRAMADOS,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
})

/** "mié., 22 oct., 7:30 a. m." en hora de Colombia. */
export function fechaProgramada(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : FORMATO.format(d)
}
