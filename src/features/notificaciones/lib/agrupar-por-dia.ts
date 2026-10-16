import { format, formatDistanceToNowStrict, isSameDay, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export interface GrupoPorDia<T> {
  /** `yyyy-MM-dd`, estable para `key`. */
  dia: string
  etiqueta: string
  items: T[]
}

/** "Hoy", "Ayer" o "lunes, 12 de octubre". */
export function etiquetaDia(fecha: Date, hoy: Date = new Date()): string {
  if (isSameDay(fecha, hoy)) return "Hoy"
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (isSameDay(fecha, ayer)) return "Ayer"
  const etiqueta = format(fecha, "EEEE, d 'de' MMMM", { locale: es })
  return etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)
}

/**
 * Agrupa una lista YA ordenada por fecha descendente en bloques por día local.
 * No reordena: el orden lo fija el cursor del backend (D-2.3).
 */
export function agruparPorDia<T extends { creadaEn: string }>(items: T[], hoy: Date = new Date()): GrupoPorDia<T>[] {
  const grupos: GrupoPorDia<T>[] = []
  for (const item of items) {
    const fecha = parseISO(item.creadaEn)
    const dia = format(fecha, "yyyy-MM-dd")
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.dia === dia) ultimo.items.push(item)
    else grupos.push({ dia, etiqueta: etiquetaDia(fecha, hoy), items: [item] })
  }
  return grupos
}

/** "hace 5 minutos" para la hora de cada entrada. */
export function tiempoRelativo(iso: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true, locale: es })
  } catch {
    return ""
  }
}
