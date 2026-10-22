import { describe, expect, it } from "vitest"

import {
  bogotaAInstante,
  errorProgramacion,
  instanteABogota,
  localAPared,
  paredALocal,
  sugerenciaProgramacion,
} from "@/features/comunicaciones/chat/lib/programacion"

// 2026-10-21 12:00 en Bogotá = 17:00 UTC.
const AHORA = Date.parse("2026-10-21T17:00:00Z")

describe("hora de Bogotá", () => {
  it("convierte la hora local de Bogotá al instante (UTC-5, sin horario de verano)", () => {
    expect(new Date(bogotaAInstante("2026-10-21T07:30")).toISOString()).toBe(
      "2026-10-21T12:30:00.000Z",
    )
    // En julio tampoco hay horario de verano.
    expect(new Date(bogotaAInstante("2026-07-01T00:00")).toISOString()).toBe(
      "2026-07-01T05:00:00.000Z",
    )
    expect(bogotaAInstante("21/10/2026 07:30")).toBeNaN()
  })

  it("muestra un instante como hora de Bogotá, cruzando el día", () => {
    expect(instanteABogota("2026-10-22T03:15:00Z")).toBe("2026-10-21T22:15")
    expect(instanteABogota(bogotaAInstante("2026-12-31T23:59"))).toBe("2026-12-31T23:59")
  })

  it("la hora de pared del selector se conserva tal cual", () => {
    const d = localAPared("2026-10-21T18:45")
    expect(d && paredALocal(d)).toBe("2026-10-21T18:45")
    expect(localAPared("")).toBeUndefined()
  })

  it("sugiere la próxima media hora con margen", () => {
    expect(sugerenciaProgramacion(AHORA)).toBe("2026-10-21T12:30")
    expect(sugerenciaProgramacion(Date.parse("2026-10-21T17:26:00Z"))).toBe("2026-10-21T13:00")
  })
})

describe("errorProgramacion", () => {
  it("exige fecha, hora futura y como máximo un año", () => {
    expect(errorProgramacion(null, AHORA)).toMatch(/Elige la fecha/)
    expect(errorProgramacion("mañana", AHORA)).toMatch(/no es válida/)
    expect(errorProgramacion("2026-10-21T12:00", AHORA)).toMatch(/posterior/)
    expect(errorProgramacion("2026-10-21T12:02", AHORA)).toBeNull()
    expect(errorProgramacion("2027-10-22T12:00", AHORA)).toMatch(/un año/)
  })
})
