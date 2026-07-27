import { format, parseISO } from "date-fns"

/**
 * Formato en el que los filtros mandan fecha+hora al backend. Vive acá y no
 * en cada formulario para que los tres filtros de auditoría no puedan
 * desincronizarse del handler que los parsea.
 */
export const DATE_TIME_VALUE_FORMAT = "yyyy-MM-dd'T'HH:mm"

/** String del formulario → `Date` para los pickers. */
export function parseDateTimeValue(value: string): Date | undefined {
  return value ? parseISO(value) : undefined
}

/** `Date` del picker → string del formulario (vacío cuando se limpia). */
export function formatDateTimeValue(date: Date | undefined): string {
  return date ? format(date, DATE_TIME_VALUE_FORMAT) : ""
}
