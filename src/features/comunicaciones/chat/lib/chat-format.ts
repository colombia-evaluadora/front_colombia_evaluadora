import { format, isSameDay, isToday, isYesterday } from "date-fns"
import { es } from "date-fns/locale"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

export function horaMensaje(fecha: string) {
  return format(new Date(fecha), "h:mm a")
}

export function etiquetaDia(fecha: string) {
  const d = new Date(fecha)
  if (isToday(d)) return "Hoy"
  if (isYesterday(d)) return "Ayer"
  const texto = format(d, "EEEE d 'de' MMMM", { locale: es })
  return texto[0].toUpperCase() + texto.slice(1)
}

export function formatoMiembros(total: number) {
  return new Intl.NumberFormat("es-CO").format(total)
}

export interface GrupoDia {
  clave: string
  etiqueta: string
  mensajes: Mensaje[]
}

// Agrupa por día para pintar el separador de fecha.
export function agruparPorDia(mensajes: Mensaje[]): GrupoDia[] {
  const grupos: GrupoDia[] = []
  for (const m of mensajes) {
    const ultimo = grupos.at(-1)
    if (ultimo && isSameDay(new Date(ultimo.mensajes[0].fecha), new Date(m.fecha))) {
      ultimo.mensajes.push(m)
    } else {
      grupos.push({ clave: m.fecha.slice(0, 10), etiqueta: etiquetaDia(m.fecha), mensajes: [m] })
    }
  }
  return grupos
}

export function fechaLarga(fecha: string) {
  return format(new Date(fecha), "d 'de' MMMM 'de' yyyy", { locale: es })
}

export function fechaCorta(fecha: string) {
  const d = new Date(fecha)
  if (isToday(d)) return `Hoy, ${horaMensaje(fecha)}`
  if (isYesterday(d)) return `Ayer, ${horaMensaje(fecha)}`
  return format(d, "d MMM yyyy, h:mm a", { locale: es })
}
