import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type {
  CalendarEntry,
  CalendarEntryOrigin,
  CalendarEntryType,
} from "@/features/establishment/academic-period/api/types/academic-calendar"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

export interface CalendarEntryRow {
  id: number
  tipo: CalendarEntryType
  origen: CalendarEntryOrigin
  fecha_desde: string
  fecha_hasta: string
  motivo: string
}

export const toCalendarEntry = (row: CalendarEntryRow): CalendarEntry => ({
  id: row.id,
  type: row.tipo,
  origin: row.origen,
  from: row.fecha_desde.slice(0, 10),
  to: row.fecha_hasta.slice(0, 10),
  reason: row.motivo,
})

// `GET /eval-col/calendario/:periodId`: las entradas registradas y los
// festivos del período (Sección 5.8), ordenados por fecha.
async function fetchAcademicCalendar(academicPeriodId: number): Promise<CalendarEntry[]> {
  const rows = await evalCol.getRows<CalendarEntryRow>(`/calendario/${academicPeriodId}`)
  return rows.map(toCalendarEntry).sort((a, b) => a.from.localeCompare(b.from))
}

export function useAcademicCalendarQuery(academicPeriodId: number | undefined) {
  return useQuery({
    queryKey: academicPeriodKeys.academicCalendar.byPeriod(academicPeriodId ?? 0),
    queryFn: () => fetchAcademicCalendar(academicPeriodId!),
    enabled: academicPeriodId != null,
  })
}
