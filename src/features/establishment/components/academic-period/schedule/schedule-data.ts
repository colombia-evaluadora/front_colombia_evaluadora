export type SubjectColor =
  | "primary"
  | "success"
  | "chart3"
  | "chart1"
  | "chart2"
  | "destructive"
  | "warning"
  | "muted"
  | "accent"
  | "foreground"
  | "chart5"

export interface Subject {
  id: string
  name: string
  color: SubjectColor
  blocks: number
}

export interface SubjectColorClasses {
  container: string
  count: string
}

export const SUBJECT_COLOR_CLASSES: Record<SubjectColor, SubjectColorClasses> = {
  primary: {
    container: "bg-primary-22 text-primary border-primary-stroke",
    count: "bg-primary text-primary-foreground",
  },
  success: {
    container: "bg-success-22 text-success border-success-stroke",
    count: "bg-success text-success-foreground",
  },
  destructive: {
    container: "bg-destructive-22 text-destructive border-destructive-stroke",
    count: "bg-destructive text-destructive-foreground",
  },
  warning: {
    container: "bg-warning-22 text-warning-foreground border-warning-stroke",
    count: "bg-warning text-warning-foreground",
  },
  muted: {
    container: "bg-muted text-muted-foreground border-muted-stroke",
    count: "bg-muted-foreground text-background",
  },
  foreground: {
    container: "bg-foreground-22 text-foreground border-foreground-stroke",
    count: "bg-foreground text-background",
  },
  accent: {
    container: "bg-accent/20 text-accent-foreground border-accent/40",
    count: "bg-accent text-accent-foreground",
  },
  chart1: {
    container: "bg-chart-1/15 text-chart-1 border-chart-1/35",
    count: "bg-chart-1 text-white",
  },
  chart2: {
    container: "bg-chart-2/15 text-chart-2 border-chart-2/35",
    count: "bg-chart-2 text-white",
  },
  chart3: {
    container: "bg-chart-3/15 text-chart-3 border-chart-3/35",
    count: "bg-chart-3 text-white",
  },
  chart5: {
    container: "bg-chart-5/25 text-foreground border-chart-5/50",
    count: "bg-chart-5 text-foreground",
  },
}

export const SUBJECTS: Subject[] = [
  { id: "matematicas", name: "Matemáticas", color: "primary", blocks: 2 },
  { id: "naturales", name: "Naturales", color: "success", blocks: 4 },
  { id: "sociales", name: "Sociales", color: "chart3", blocks: 3 },
  { id: "espanol", name: "Español", color: "chart1", blocks: 3 },
  { id: "ingles", name: "Inglés", color: "chart2", blocks: 3 },
  { id: "tecnologia", name: "Tecnología E Informática", color: "destructive", blocks: 2 },
  { id: "edu-fisica", name: "Educación Física", color: "warning", blocks: 2 },
  { id: "quimica", name: "Química", color: "muted", blocks: 2 },
  { id: "etica", name: "Ética Y Valores", color: "accent", blocks: 1 },
  { id: "comprension", name: "Comprensión Lectora", color: "foreground", blocks: 1 },
  { id: "geometria", name: "Geometría", color: "chart5", blocks: 1 },
]

export const SUBJECTS_BY_ID: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((subject) => [subject.id, subject])
)

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

export const GRADE_GROUP_OPTIONS: string[] = [
  "Sexto - 0601 - Mañana",
  "Séptimo - 0701 - Mañana",
  "Octavo - 0801 - Tarde",
  "Noveno - 0901 - Tarde",
]
