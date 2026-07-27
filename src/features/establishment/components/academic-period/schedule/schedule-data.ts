// Materia del horario del grado, derivada en runtime del plan de estudio
// (nombre + intensidad horaria) y del color definido en área/asignatura.
export interface ScheduleSubject {
  id: string
  name: string
  // Cantidad de bloques = intensidad horaria de la asignatura.
  blocks: number
  // Color en formato hex (#rrggbb) tomado de área/asignatura.
  color: string
}

// Color de reserva cuando la asignatura del plan no tiene un área/asignatura
// con color asignado.
export const DEFAULT_SUBJECT_COLOR = "#64748b"

export interface Day {
  id: string
  label: string
  // getDay() de JS (0 = domingo). Se usa para resaltar el día actual.
  weekday: number
}

export const DAYS: Day[] = [
  { id: "lun", label: "LUNES", weekday: 1 },
  { id: "mar", label: "MARTES", weekday: 2 },
  { id: "mie", label: "MIÉRCOLES", weekday: 3 },
  { id: "jue", label: "JUEVES", weekday: 4 },
  { id: "vie", label: "VIERNES", weekday: 5 },
]

export type SlotKind = "class" | "break" | "exit"

export interface Slot {
  id: string
  time: string
  kind: SlotKind
  // Marca de agua para descanso/salida ("DESCANSO", "SALIDA").
  label?: string
}

// Un descanso definido por su rango horario (igual que en el periodo académico).
export interface JornadaBreak {
  startTime: string // "HH:mm" 24h
  endTime: string
}

// La jornada NO se define acá: proviene del periodo académico (hora inicio,
// hora fin, número de bloques y descansos). El horario solo la consume para
// generar la grilla, evitando duplicar esas variables.
export interface Jornada {
  startTime: string // "HH:mm" 24h
  endTime: string
  blocksCount: number | null
  breaks: JornadaBreak[]
}

// Fallback usado si el periodo aún no tiene la jornada completa. Reproduce la
// jornada de ejemplo (6:45am–12:45pm, 6 bloques, 2 descansos).
export const DEFAULT_JORNADA: Jornada = {
  startTime: "06:45",
  endTime: "12:45",
  blocksCount: 6,
  breaks: [
    { startTime: "08:15", endTime: "09:00" },
    { startTime: "10:30", endTime: "11:15" },
  ],
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatClock(hhmm: string): string {
  if (!hhmm) return ""
  return formatTime(toMinutes(hhmm))
}

function formatTime(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440
  const hours24 = Math.floor(minutesInDay / 60)
  const minutes = minutesInDay % 60
  const period = hours24 < 12 ? "am" : "pm"
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`
}

// Genera las franjas (clase / descanso / salida) a partir de la jornada del
// periodo académico. La duración de cada bloque se deduce del tiempo lectivo
// (fin − inicio − descansos) dividido por la cantidad de bloques. Los bloques
// de clase se identifican por número (c1, c2, …) para que las materias
// colocadas no se desacomoden.
export function buildSlots(jornada: Jornada): Slot[] {
  const start = toMinutes(jornada.startTime)
  const end = toMinutes(jornada.endTime)
  if (!jornada.startTime || !jornada.endTime || end <= start) return []

  const breaks = jornada.breaks
    .filter((brk) => brk.startTime && brk.endTime)
    .map((brk) => ({ start: toMinutes(brk.startTime), end: toMinutes(brk.endTime) }))
    .filter((brk) => brk.end > brk.start && brk.start >= start && brk.end <= end)
    .sort((a, b) => a.start - b.start)

  // Segmentos lectivos entre descansos.
  const segments: { start: number; end: number }[] = []
  let cursor = start
  for (const brk of breaks) {
    if (brk.start > cursor) segments.push({ start: cursor, end: brk.start })
    cursor = Math.max(cursor, brk.end)
  }
  if (end > cursor) segments.push({ start: cursor, end })

  const teachingTotal = segments.reduce((acc, seg) => acc + (seg.end - seg.start), 0)
  const blocksCount =
    jornada.blocksCount && jornada.blocksCount > 0
      ? jornada.blocksCount
      : Math.max(1, Math.round(teachingTotal / 45))
  const blockMinutes = teachingTotal / blocksCount

  const slots: Slot[] = []
  let placed = 0
  let blockNumber = 1

  segments.forEach((seg, segIndex) => {
    const isLast = segIndex === segments.length - 1
    const segLen = seg.end - seg.start
    // El último segmento toma los bloques restantes para no perder la cuenta.
    const blocksInSeg = Math.max(
      0,
      isLast ? blocksCount - placed : Math.round(segLen / blockMinutes)
    )

    // Los bloques llenan el segmento de forma pareja, así el siguiente descanso
    // arranca justo cuando termina el último bloque (sin huecos ni solapes).
    const localBlock = blocksInSeg > 0 ? segLen / blocksInSeg : blockMinutes

    for (let k = 0; k < blocksInSeg; k++) {
      slots.push({
        id: `c${blockNumber}`,
        time: formatTime(Math.round(seg.start + k * localBlock)),
        kind: "class",
      })
      blockNumber++
    }
    placed += blocksInSeg

    const brk = breaks[segIndex]
    if (!isLast && brk) {
      slots.push({
        id: `brk${segIndex}`,
        time: formatTime(brk.start),
        kind: "break",
        label: "DESCANSO",
      })
    }
  })

  slots.push({ id: "exit", time: formatTime(end), kind: "exit", label: "SALIDA" })

  return slots
}

// Corridas de franjas de clase contiguas (separadas por descansos). El merge
// vertical de materias solo puede ocurrir dentro de una misma corrida.
export function buildRuns(slots: Slot[]): string[][] {
  const runs: string[][] = []
  let current: string[] = []
  for (const slot of slots) {
    if (slot.kind === "class") {
      current.push(slot.id)
    } else if (current.length) {
      runs.push(current)
      current = []
    }
  }
  if (current.length) runs.push(current)
  return runs
}
