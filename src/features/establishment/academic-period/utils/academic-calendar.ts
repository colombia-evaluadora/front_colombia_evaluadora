import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfWeek } from "date-fns"

import type {
  CalendarEntry,
  CalendarEntryType,
} from "@/features/establishment/academic-period/api/types/academic-calendar"

export const CALENDAR_ENTRY_TYPE_LABELS: Record<CalendarEntryType, string> = {
  FESTIVO: "Festivo",
  VACACIONES: "Vacaciones o pausa",
  SUSPENSION: "Suspensión o evento institucional",
  HABIL: "Día hábil por excepción",
}

// Los que registra el establecimiento (Sección 5.8); los festivos llegan solos.
export const REGISTERED_ENTRY_TYPES = ["VACACIONES", "SUSPENSION", "HABIL"] as const

const toIso = (date: Date) => format(date, "yyyy-MM-dd")

// "22/03/2027" o "21/06/2027 – 12/07/2027".
export function formatCalendarRange(from: string, to: string): string {
  const show = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")
  return from === to ? show(from) : `${show(from)} – ${show(to)}`
}

function eachDay(from: string, to: string): string[] {
  const start = parseISO(from)
  const total = differenceInCalendarDays(parseISO(to), start)
  return Array.from({ length: Math.max(total + 1, 0) }, (_, i) => toIso(addDays(start, i)))
}

// Días que el calendario quita (festivos, vacaciones, suspensiones), sin las
// excepciones. "Día hábil por excepción" solo vale sobre estos (Sección 5.8).
export function getNonWorkingDays(entries: CalendarEntry[], exceptId?: number): Set<string> {
  const days = new Set<string>()
  for (const entry of entries) {
    if (entry.id === exceptId || entry.type === "HABIL") continue
    for (const day of eachDay(entry.from, entry.to)) days.add(day)
  }
  return days
}

// Resumen bajo la tabla: los días con clase salen del horario (lunes a
// sábado, Regla 71), y el calendario solo quita o devuelve días (Regla 109).
// Semana lectiva = semana con al menos un día hábil.
export function getCalendarSummary(
  entries: CalendarEntry[],
  periodStart: string,
  periodEnd: string,
): { workingDays: number; teachingWeeks: number } {
  const nonWorking = getNonWorkingDays(entries)
  for (const entry of entries) {
    if (entry.type !== "HABIL") continue
    for (const day of eachDay(entry.from, entry.to)) nonWorking.delete(day)
  }
  let workingDays = 0
  const weeks = new Set<string>()
  for (const day of eachDay(periodStart, periodEnd)) {
    if (getDay(parseISO(day)) === 0 || nonWorking.has(day)) continue
    workingDays++
    weeks.add(toIso(startOfWeek(parseISO(day), { weekStartsOn: 1 })))
  }
  return { workingDays, teachingWeeks: weeks.size }
}
