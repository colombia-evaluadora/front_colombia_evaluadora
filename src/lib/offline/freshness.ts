import { format } from "date-fns"
import { es } from "date-fns/locale"

/** "Datos del 12 oct, 08:30" (spec `offline-persistence`, "Antigüedad de los datos"). */
export function formatDatosDel(updatedAt: number): string {
  return `Datos del ${format(updatedAt, "d MMM, HH:mm", { locale: es })}`
}

/** `true` si el dato superó su TTL (se muestra en rojo). */
export function isDatoVencido(updatedAt: number, ttl: number, now: number = Date.now()): boolean {
  return now - updatedAt > ttl
}
