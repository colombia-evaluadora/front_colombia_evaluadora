export interface ScheduleSubject {
  id: string
  name: string
  abbreviation?: string
  blocks: number
  color: string
}

export const DEFAULT_SUBJECT_COLOR = "#64748b"

export interface Day {
  id: string
  label: string
  weekday: number
  dayId: number
}

export const DAYS: Day[] = [
  { id: "dom", label: "DOMINGO", weekday: 1, dayId: 278 },
  { id: "lun", label: "LUNES", weekday: 2, dayId: 272 },
  { id: "mar", label: "MARTES", weekday: 3, dayId: 273 },
  { id: "mie", label: "MIÉRCOLES", weekday: 4, dayId: 274 },
  { id: "jue", label: "JUEVES", weekday: 5, dayId: 275 },
  { id: "vie", label: "VIERNES", weekday: 6, dayId: 276 },
  { id: "sab", label: "SÁBADO", weekday: 7, dayId: 277 },
]

export type SlotKind = "class" | "break" | "exit"

export interface Slot {
  id: string
  time: string
  kind: SlotKind
  label?: string
}

export interface JornadaBreak {
  startTime: string
  endTime: string
}

export interface Jornada {
  startTime: string
  endTime: string
  blocksCount: number | null
  breaks: JornadaBreak[]
}

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

export function buildSlots(jornada: Jornada): Slot[] {
  const start = toMinutes(jornada.startTime)
  const end = toMinutes(jornada.endTime)
  if (!jornada.startTime || !jornada.endTime || end <= start) return []

  const breaks = jornada.breaks
    .filter((brk) => brk.startTime && brk.endTime)
    .map((brk) => ({ start: toMinutes(brk.startTime), end: toMinutes(brk.endTime) }))
    .filter((brk) => brk.end > brk.start && brk.start >= start && brk.end <= end)
    .sort((a, b) => a.start - b.start)

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
    const blocksInSeg = Math.max(
      0,
      isLast ? blocksCount - placed : Math.round(segLen / blockMinutes),
    )
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
