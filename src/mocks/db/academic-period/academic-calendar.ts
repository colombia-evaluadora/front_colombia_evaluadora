import type { CalendarEntryRow } from "@/features/establishment/academic-period/api/query/use-academic-calendar"

export interface CalendarEntryRecord extends Omit<CalendarEntryRow, "origen"> {
  periodId: number
}

// Entradas registradas por el establecimiento; los festivos los calcula el
// handler con `getColombianHolidays`, como la lista de Administración.
export const academicCalendarDb: CalendarEntryRecord[] = [
  {
    id: 1,
    periodId: 1,
    tipo: "VACACIONES",
    fecha_desde: "2026-03-30",
    fecha_hasta: "2026-04-03",
    motivo: "Semana de receso",
  },
  {
    id: 2,
    periodId: 1,
    tipo: "SUSPENSION",
    fecha_desde: "2026-05-15",
    fecha_hasta: "2026-05-15",
    motivo: "Jornada de evaluación institucional",
  },
  {
    id: 3,
    periodId: 1,
    tipo: "VACACIONES",
    fecha_desde: "2026-06-22",
    fecha_hasta: "2026-07-10",
    motivo: "Vacaciones de mitad de año",
  },
  {
    id: 4,
    periodId: 1,
    tipo: "HABIL",
    fecha_desde: "2026-08-17",
    fecha_hasta: "2026-08-17",
    motivo: "Festivo trabajado para jornada de evaluación",
  },
]
