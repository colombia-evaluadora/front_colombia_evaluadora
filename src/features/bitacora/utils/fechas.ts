import { format } from "date-fns"

/** «15/04/2026 10:42»; si el texto no es una fecha, lo devuelve tal cual. */
export const fechaHoraDoc = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : format(d, "dd/MM/yyyy HH:mm")
}
