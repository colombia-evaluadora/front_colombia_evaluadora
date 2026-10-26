import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"

import type { Conversacion, Mensaje, UltimoMensaje } from "@/features/comunicaciones/chat/api/types"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"

// Vista previa del último mensaje en la lista de conversaciones (diseño 4516:68095): hora a la
// derecha del nombre y, debajo, "Tú: …" / "Ana: …" / texto. comms-service manda el texto ya plano y
// recortado (`ChatDtos.UltimoMensaje`); `ultimoMensajeDe` reproduce la misma regla para el mock.

export const MAX_VISTA_PREVIA = 120

/** "7:30 AM" hoy, "Ayer", el día de la semana en la última semana y "dd/MM/yy" antes. */
export function horaVistaPrevia(fecha: string, ahora: Date = new Date()): string {
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return ""
  const dias = differenceInCalendarDays(ahora, d)
  if (dias <= 0) return horaMensaje(fecha)
  if (dias === 1) return "Ayer"
  if (dias < 7) {
    const dia = format(d, "EEEE", { locale: es })
    return dia[0].toUpperCase() + dia.slice(1)
  }
  return format(d, "dd/MM/yy")
}

/** Línea de la vista previa con su prefijo: "Tú: " propio; en grupos y foros, el nombre de quien escribe. */
export function lineaVistaPrevia(c: Pick<Conversacion, "tipo" | "ultimoMensaje">): string {
  const u = c.ultimoMensaje
  if (!u) return ""
  if (u.esPropio) return `Tú: ${u.texto}`
  if (u.tipo === "NORMAL" && c.tipo !== "DIRECTO" && u.autor) {
    return `${u.autor.trim().split(/\s+/)[0]}: ${u.texto}`
  }
  return u.texto
}

function recortar(s: string): string {
  return s.length <= MAX_VISTA_PREVIA ? s : `${s.slice(0, MAX_VISTA_PREVIA - 1).trimEnd()}…`
}

/** Texto plano del compositor (mismas marcas que `TarjetasBot.textoPlano` de comms-service). */
export function textoPlanoVistaPrevia(texto: string): string {
  const s = texto
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/^\s*(?:>\s?|[-*]\s+|\d+\.\s+)/gm, "")
    .replace(/(\*\*|~~|~|`{1,3})/g, "")
    .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/<@\d+>/g, "@")
    .replace(/\s+/g, " ")
    .trim()
  return recortar(s)
}

/** Vista previa de un mensaje (mock y eventos locales); null si está eliminado. */
export function ultimoMensajeDe(m: Mensaje, usuarioId: number): UltimoMensaje | null {
  if (m.eliminado) return null
  const bot = !!m.bot
  let texto: string
  if (bot) texto = recortar(m.bot?.titulo ?? m.texto)
  else if (m.votacion) texto = recortar(`Votación rápida: ${m.votacion.pregunta}`)
  else {
    texto = textoPlanoVistaPrevia(m.texto)
    if (!texto && m.adjunto) texto = recortar(`Adjunto: ${m.adjunto.nombre}`)
  }
  return {
    texto,
    autor: m.autor.nombre,
    esPropio: !bot && m.autor.id === usuarioId,
    enviadoEn: m.fecha,
    tipo: bot ? "BOT" : m.sistema ? "SISTEMA" : "NORMAL",
  }
}
