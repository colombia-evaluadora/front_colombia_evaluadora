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

// El servidor no manda conteos mientras la votación sigue abierta (sin resultados en vivo):
// null = todavía no hay resultados (abierta, o cerró en el reloj local y falta pedirlos).
export function resultadosVotacionRapida(v: VotacionRapida) {
  if (v.opciones.some((o) => o.votos == null)) return null
  const total = v.opciones.reduce((n, o) => n + (o.votos ?? 0), 0)
  return {
    total,
    opciones: v.opciones.map((o) => ({
      ...o,
      votos: o.votos ?? 0,
      porcentaje: total ? Math.round(((o.votos ?? 0) / total) * 100) : 0,
    })),
  }
}
