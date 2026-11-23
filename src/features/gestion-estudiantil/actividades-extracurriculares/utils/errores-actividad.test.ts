import { describe, expect, it } from "vitest"

import { mensajeCupoCompleto, mensajeNombreRepetido } from "./errores-actividad"

describe("errores-actividad", () => {
  it("reconoce el cupo completo", () => {
    const m = "La actividad Club tiene su cupo completo (25 estudiantes)."
    expect(mensajeCupoCompleto(m)).toBe(m)
    expect(mensajeCupoCompleto("La actividad está inactiva.")).toBeNull()
  })
  it("reconoce el nombre repetido", () => {
    const m = "Ya existe la actividad Club en este Período Académico"
    expect(mensajeNombreRepetido(m)).toBe(m)
    expect(mensajeNombreRepetido("otro")).toBeNull()
  })
})
