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

// Domingo de Pascua (algoritmo de Meeus/Butcher).
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// Ley Emiliani: el festivo se corre al lunes siguiente si no cae en lunes.
function nextMonday(date: Date): Date {
  const weekday = getDay(date)
  return weekday === 1 ? date : addDays(date, (8 - weekday) % 7)
}

// Festivos de Colombia del año. Simula la lista de Administración del Sistema
// (su Sección 6.2), que calcula la fecha de cada año.
export function getColombianHolidays(year: number): { date: string; name: string }[] {
  const fixed = (month: number, day: number) => new Date(year, month - 1, day)
  const easter = easterSunday(year)
  const list: [Date, string][] = [
    [fixed(1, 1), "Año Nuevo"],
    [nextMonday(fixed(1, 6)), "Día de los Reyes Magos"],
    [nextMonday(fixed(3, 19)), "Día de San José"],
    [addDays(easter, -3), "Jueves Santo"],
    [addDays(easter, -2), "Viernes Santo"],
    [fixed(5, 1), "Día del Trabajo"],
    [nextMonday(addDays(easter, 39)), "Ascensión del Señor"],
    [nextMonday(addDays(easter, 60)), "Corpus Christi"],
    [nextMonday(addDays(easter, 68)), "Sagrado Corazón"],
    [nextMonday(fixed(6, 29)), "San Pedro y San Pablo"],
    [fixed(7, 20), "Día de la Independencia"],
    [fixed(8, 7), "Batalla de Boyacá"],
    [nextMonday(fixed(8, 15)), "Asunción de la Virgen"],
    [nextMonday(fixed(10, 12)), "Día de la Raza"],
    [nextMonday(fixed(11, 1)), "Todos los Santos"],
    [nextMonday(fixed(11, 11)), "Independencia de Cartagena"],
    [fixed(12, 8), "Inmaculada Concepción"],
    [fixed(12, 25), "Navidad"],
  ]
  return list.map(([date, name]) => ({ date: toIso(date), name }))
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
