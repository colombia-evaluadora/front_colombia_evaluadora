import { format, isToday, isYesterday } from "date-fns"

import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"

// Texto sin las marcas de formato (*negrita*, _cursiva_, ~tachado~, `código`, listas, citas).
export function textoPlano(texto: string) {
  return texto
    .replace(/```/g, "")
    .replace(/^\s*(?:>|[-*•]|\d+\.)\s+/gm, "")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Mensajes que contienen el término, del más reciente al más antiguo. Los avisos del sistema no cuentan.
export function buscarMensajes(mensajes: Mensaje[], termino: string) {
  const t = termino.trim().toLowerCase()
  if (!t) return []
  return mensajes
    .filter((m) => !m.sistema && textoPlano(m.texto).toLowerCase().includes(t))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// Parte el texto en tramos para resaltar cada aparición del término.
export function resaltar(texto: string, termino: string) {
  const t = termino.trim().toLowerCase()
  if (!t) return [{ texto, coincide: false }]
  const tramos: { texto: string; coincide: boolean }[] = []
  const bajo = texto.toLowerCase()
  let desde = 0
  for (let i = bajo.indexOf(t); i >= 0; i = bajo.indexOf(t, i + t.length)) {
    if (i > desde) tramos.push({ texto: texto.slice(desde, i), coincide: false })
    tramos.push({ texto: texto.slice(i, i + t.length), coincide: true })
    desde = i + t.length
  }
  if (desde < texto.length) tramos.push({ texto: texto.slice(desde), coincide: false })
  return tramos
}

// "Hoy, 7:31 AM", "Ayer, 9:00 AM" o "5/12, 10:25 AM".
export function fechaResultado(fecha: string) {
  const d = new Date(fecha)
  if (isToday(d)) return `Hoy, ${horaMensaje(fecha)}`
  if (isYesterday(d)) return `Ayer, ${horaMensaje(fecha)}`
  return `${format(d, "d/M")}, ${horaMensaje(fecha)}`
}
