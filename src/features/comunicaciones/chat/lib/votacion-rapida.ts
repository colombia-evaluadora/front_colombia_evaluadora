import type { TipoVotacionRapida, VotacionRapida } from "@/features/comunicaciones/chat/api/types"

export const ETIQUETAS_VOTACION_RAPIDA: Record<TipoVotacionRapida, [string, string]> = {
  SI_NO: ["Sí", "No"],
  VERDADERO_FALSO: ["Verdadero", "Falso"],
}

export const MINUTOS_VOTACION_RAPIDA = [1, 2, 5, 10, 15, 30] as const

// Segundos que le quedan; 0 si ya cerró.
export function segundosRestantes(v: VotacionRapida, ahora: number) {
  return Math.max(0, Math.ceil((new Date(v.cierraEn).getTime() - ahora) / 1000))
}

// "04:59"
export function cuentaRegresiva(segundos: number) {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function resultadosVotacionRapida(v: VotacionRapida) {
  const total = v.opciones.reduce((n, o) => n + o.votos, 0)
  return {
    total,
    opciones: v.opciones.map((o) => ({
      ...o,
      porcentaje: total ? Math.round((o.votos / total) * 100) : 0,
    })),
  }
}
