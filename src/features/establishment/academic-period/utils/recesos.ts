import type { AcademicPeriodBreak } from "@/features/establishment/academic-period/api/types/academic-period"

/** Ubicación del receso: al inicio, después de un bloque o al final de la jornada. */
export type RecesoUbicacion = "INICIO" | "BLOQUE" | "FINAL"

/** Receso tal como lo manda y devuelve el backend (`RECESOS` / `recesos`, JSONB camelCase). */
export interface RecesoRow {
  label: string
  location: RecesoUbicacion
  afterBlock: number | null
  durationMinutes: number
}

export const RECESO_LABEL_MIN = 4
export const RECESO_LABEL_MAX = 50

// En el formulario la ubicación es un solo valor: "INICIO", "FINAL" o el número de bloque.
export function toRecesoLocation(location: string): Pick<RecesoRow, "location" | "afterBlock"> {
  if (location === "INICIO" || location === "FINAL") return { location, afterBlock: null }
  return { location: "BLOQUE", afterBlock: Number(location) }
}

function fromRecesoLocation(row: Pick<RecesoRow, "location" | "afterBlock">): string {
  return row.location === "BLOQUE" ? String(row.afterBlock ?? "") : row.location
}

/** Body `RECESOS`: arreglo completo; `[]` borra todos los recesos de la jornada. */
export function toRecesosBody(breaks: AcademicPeriodBreak[] | undefined): RecesoRow[] {
  return (breaks ?? []).map((b) => ({
    label: b.label.trim(),
    ...toRecesoLocation(b.location),
    durationMinutes: b.durationMinutes ?? 0,
  }))
}

export function fromRecesosRows(rows: RecesoRow[] | null | undefined): AcademicPeriodBreak[] {
  return (rows ?? []).map((r) => ({
    label: r.label ?? "",
    location: fromRecesoLocation(r),
    durationMinutes: r.durationMinutes ?? null,
  }))
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function getRecesosMinutes(breaks: Pick<AcademicPeriodBreak, "durationMinutes">[]): number {
  return breaks.reduce((sum, b) => sum + Math.max(0, b.durationMinutes ?? 0), 0)
}

/**
 * Duración de la hora de clase (Regla 32):
 * (Hora final − Hora inicio − duración de los recesos) ÷ Número de bloques.
 * null si faltan datos o el resultado no tiene sentido.
 */
export function getClassMinutes(
  startTime: string,
  endTime: string,
  blocks: number | null,
  breaks: Pick<AcademicPeriodBreak, "durationMinutes">[],
): number | null {
  if (!startTime || !endTime || !blocks || blocks <= 0) return null
  const total = toMinutes(endTime) - toMinutes(startTime)
  if (total <= 0) return null
  const minutes = (total - getRecesosMinutes(breaks)) / blocks
  return minutes > 0 ? minutes : null
}

/** Posición del receso en la jornada: 0 al inicio, N después del bloque N. */
function slotOf(location: string, blocks: number): number | null {
  if (location === "INICIO") return 0
  if (location === "FINAL") return blocks
  const n = Number(location)
  return Number.isInteger(n) && n >= 1 && n <= blocks ? n : null
}

/**
 * Hora de inicio y fin de cada receso (Regla 32): parte de la Hora inicio y suma
 * los bloques y los recesos anteriores. null si el receso no se puede ubicar.
 */
export function getRecesoTimes(
  startTime: string,
  endTime: string,
  blocks: number | null,
  breaks: AcademicPeriodBreak[],
): ({ startTime: string; endTime: string } | null)[] {
  const classMinutes = getClassMinutes(startTime, endTime, blocks, breaks)
  if (classMinutes == null || !blocks) return breaks.map(() => null)
  const ordered = breaks
    .map((b, index) => ({ b, index, slot: slotOf(b.location, blocks) }))
    .filter((x) => x.slot != null && (x.b.durationMinutes ?? 0) > 0)
    .sort((a, z) => a.slot! - z.slot! || a.index - z.index)

  const result: ({ startTime: string; endTime: string } | null)[] = breaks.map(() => null)
  let breaksBefore = 0
  for (const { b, index, slot } of ordered) {
    const start = toMinutes(startTime) + slot! * classMinutes + breaksBefore
    const duration = b.durationMinutes ?? 0
    result[index] = { startTime: toTime(start), endTime: toTime(start + duration) }
    breaksBefore += duration
  }
  return result
}

export function getRecesoLocationLabel(location: string): string {
  if (location === "INICIO") return "Al inicio de la jornada"
  if (location === "FINAL") return "Al final de la jornada"
  return `Después del bloque ${location}`
}

/** Recesos con sus horas calculadas, para armar el horario de la jornada. */
export function toJornadaBreaks(
  startTime: string,
  endTime: string,
  blocks: number | null,
  breaks: AcademicPeriodBreak[],
): { label: string; startTime: string; endTime: string }[] {
  const times = getRecesoTimes(startTime, endTime, blocks, breaks)
  return breaks.flatMap((b, i) => (times[i] ? [{ label: b.label, ...times[i] }] : []))
}

export type ScheduleSlot =
  | { kind: "block"; block: number; startTime: string; endTime: string }
  | { kind: "break"; label: string; startTime: string; endTime: string }

/**
 * Filas del horario de un grupo (Reglas 32 y 71): los bloques de la jornada con
 * su hora, y cada receso intercalado donde lo ubica su Ubicación. `block` es
 * 1-based, como se muestra.
 */
export function getScheduleSlots(
  startTime: string,
  endTime: string,
  blocks: number | null,
  breaks: AcademicPeriodBreak[],
): ScheduleSlot[] {
  const classMinutes = getClassMinutes(startTime, endTime, blocks, breaks)
  if (classMinutes == null || !blocks) return []
  const times = getRecesoTimes(startTime, endTime, blocks, breaks)
  const breaksAt = (slot: number) =>
    breaks
      .map((b, i) => ({ b, t: times[i] }))
      .filter(({ b, t }) => t != null && slotOf(b.location, blocks) === slot)
      .map(({ b, t }) => ({ kind: "break" as const, label: b.label, ...t! }))

  const slots: ScheduleSlot[] = [...breaksAt(0)]
  let cursor = toMinutes(startTime) + breaksAt(0).reduce((sum, b) => sum + toMinutes(b.endTime) - toMinutes(b.startTime), 0)
  for (let n = 1; n <= blocks; n++) {
    const end = cursor + classMinutes
    slots.push({ kind: "block", block: n, startTime: toTime(cursor), endTime: toTime(end) })
    cursor = end
    for (const brk of breaksAt(n)) {
      slots.push(brk)
      cursor += toMinutes(brk.endTime) - toMinutes(brk.startTime)
    }
  }
  return slots
}
