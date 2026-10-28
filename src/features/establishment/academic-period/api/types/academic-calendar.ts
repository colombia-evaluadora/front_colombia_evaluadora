// Calendario académico del período (Sección 5.8, Regla 109).
export type CalendarEntryType = "FESTIVO" | "VACACIONES" | "SUSPENSION" | "HABIL"

// FESTIVO = de la lista de Administración del Sistema, solo lectura.
export type CalendarEntryOrigin = "FESTIVO" | "REGISTRADO"

export interface CalendarEntry {
  // Los festivos no tienen registro propio: llegan con id negativo.
  id: number
  type: CalendarEntryType
  origin: CalendarEntryOrigin
  from: string
  to: string
  reason: string
}

export interface CalendarEntryInput {
  type: Exclude<CalendarEntryType, "FESTIVO">
  from: string
  to: string
  reason: string
}
