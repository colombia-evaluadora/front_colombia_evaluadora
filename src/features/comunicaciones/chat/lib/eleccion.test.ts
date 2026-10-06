import { describe, expect, it } from "vitest"

import type { Eleccion } from "@/features/comunicaciones/chat/api/types"
import {
  cuentaRegresiva,
  estadoEleccion,
  resultados,
} from "@/features/comunicaciones/chat/lib/eleccion"

const base: Eleccion = {
  conversacionId: 1,
  nombre: "E",
  descripcion: "",
  fechaInicio: null,
  fechaCierre: null,
  jornadaId: 1,
  verResultadosEnVivo: true,
  permitirComentarios: false,
  candidatos: [
    { id: 1, nombre: "A", numero: "1", lema: "", fotoUrl: null, votos: 10 },
    { id: 2, nombre: "B", numero: "2", lema: "", fotoUrl: null, votos: 30 },
  ],
  votosEnBlanco: 10,
  totalHabilitados: 60,
  vieronCanal: 50,
  creadoPor: "Ana",
  esCreador: true,
}

describe("estadoEleccion", () => {
  it("usa las fechas de inicio y cierre", () => {
    const ahora = Date.parse("2026-03-20T10:00:00Z")
    expect(estadoEleccion({ fechaInicio: "2026-03-21T00:00:00Z", fechaCierre: null }, ahora)).toBe(
      "PROGRAMADA",
    )
    expect(estadoEleccion({ fechaInicio: null, fechaCierre: "2026-03-20T09:00:00Z" }, ahora)).toBe(
      "FINALIZADA",
    )
    expect(estadoEleccion({ fechaInicio: null, fechaCierre: null }, ahora)).toBe("ACTIVA")
  })
})

describe("cuentaRegresiva", () => {
  it("formatea horas, minutos y segundos", () => {
    expect(cuentaRegresiva(30 * 60_000 + 35_000)).toBe("00:30:35")
    expect(cuentaRegresiva(-5)).toBe("00:00:00")
    expect(cuentaRegresiva(26 * 3_600_000)).toBe("1 d 02:00:00")
  })
})

describe("resultados", () => {
  it("ordena por votos, deja el blanco al final y marca ganador solo al cerrar", () => {
    const abiertas = resultados(base, false)
    expect(abiertas.map((f) => f.candidato?.nombre ?? "blanco")).toEqual(["B", "A", "blanco"])
    expect(abiertas.map((f) => f.porcentaje)).toEqual([60, 20, 20])
    expect(abiertas.some((f) => f.ganador)).toBe(false)
    expect(resultados(base, true)[0].ganador).toBe(true)
  })

  it("no declara ganador si hay empate", () => {
    const empate = { ...base, candidatos: base.candidatos.map((c) => ({ ...c, votos: 5 })) }
    expect(resultados(empate, true).some((f) => f.ganador)).toBe(false)
  })
})
