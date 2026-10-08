import { describe, expect, it } from "vitest"

import type { VotacionRapida } from "@/features/comunicaciones/chat/api/types"
import {
  cuentaRegresiva,
  resultadosVotacionRapida,
  segundosRestantes,
} from "@/features/comunicaciones/chat/lib/votacion-rapida"

const v = (votos: [number, number], cierraEn = "2026-01-01T10:05:00Z"): VotacionRapida => ({
  pregunta: "¿Suspender clases mañana?",
  tipo: "SI_NO",
  minutos: 5,
  cierraEn,
  miVoto: null,
  opciones: [
    { id: 1, etiqueta: "Sí", votos: votos[0] },
    { id: 2, etiqueta: "No", votos: votos[1] },
  ],
})

describe("votación rápida", () => {
  it("cuenta los segundos que faltan y no baja de cero", () => {
    const ahora = new Date("2026-01-01T10:00:01Z").getTime()
    expect(segundosRestantes(v([0, 0]), ahora)).toBe(299)
    expect(segundosRestantes(v([0, 0]), ahora + 600_000)).toBe(0)
  })

  it("formatea mm:ss", () => {
    expect(cuentaRegresiva(299)).toBe("04:59")
    expect(cuentaRegresiva(0)).toBe("00:00")
  })

  it("calcula porcentajes y total", () => {
    const r = resultadosVotacionRapida(v([18, 9]))
    expect(r.total).toBe(27)
    expect(r.opciones.map((o) => o.porcentaje)).toEqual([67, 33])
    expect(resultadosVotacionRapida(v([0, 0])).opciones[0].porcentaje).toBe(0)
  })
})
