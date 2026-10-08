import type { Candidato, Eleccion } from "@/features/comunicaciones/chat/api/types"

export type EstadoEleccion = "PROGRAMADA" | "ACTIVA" | "FINALIZADA"

export function estadoEleccion(
  e: Pick<Eleccion, "fechaInicio" | "fechaCierre"> & { cerradaManualmente?: boolean },
  ahora = Date.now(),
): EstadoEleccion {
  if (e.cerradaManualmente) return "FINALIZADA"
  if (e.fechaInicio && Date.parse(e.fechaInicio) > ahora) return "PROGRAMADA"
  if (e.fechaCierre && Date.parse(e.fechaCierre) <= ahora) return "FINALIZADA"
  return "ACTIVA"
}

// "00:30:35"; más de un día se muestra como "1 d 02:00:00".
export function cuentaRegresiva(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const dias = Math.floor(s / 86400)
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0")
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${dias > 0 ? `${dias} d ` : ""}${hh}:${mm}:${ss}`
}

export function porcentaje(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

export function totalVotos(e: Eleccion) {
  return e.candidatos.reduce((s, c) => s + c.votos, 0) + e.votosEnBlanco
}

export interface FilaResultado {
  // null = voto en blanco
  candidato: Candidato | null
  votos: number
  porcentaje: number
  ganador: boolean
}

// Candidatos de más a menos votos y el voto en blanco siempre al final.
// Hay ganador solo con la votación cerrada y sin empate en el primer lugar.
export function resultados(e: Eleccion, finalizada: boolean): FilaResultado[] {
  const total = totalVotos(e)
  const orden = [...e.candidatos].sort((a, b) => b.votos - a.votos)
  const empate = orden.length > 1 && orden[0].votos === orden[1].votos
  const filas: FilaResultado[] = orden.map((c, i) => ({
    candidato: c,
    votos: c.votos,
    porcentaje: porcentaje(c.votos, total),
    ganador: finalizada && i === 0 && !empate && c.votos > 0,
  }))
  filas.push({
    candidato: null,
    votos: e.votosEnBlanco,
    porcentaje: porcentaje(e.votosEnBlanco, total),
    ganador: false,
  })
  return filas
}
