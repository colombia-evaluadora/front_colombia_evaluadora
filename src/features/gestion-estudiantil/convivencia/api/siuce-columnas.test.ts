import { describe, expect, it } from "vitest"

import { GRUPOS_SIUCE, SIUCE_COLUMNAS } from "@/features/gestion-estudiantil/convivencia/api/siuce-columnas"

describe("SIUCE_COLUMNAS", () => {
  it("no repite claves y cada columna cae en un grupo declarado", () => {
    expect(new Set(SIUCE_COLUMNAS.map((c) => c.clave)).size).toBe(SIUCE_COLUMNAS.length)
    for (const c of SIUCE_COLUMNAS) expect(GRUPOS_SIUCE).toContain(c.grupo)
  })
  it("todos los grupos tienen al menos una columna", () => {
    for (const g of GRUPOS_SIUCE) expect(SIUCE_COLUMNAS.some((c) => c.grupo === g)).toBe(true)
  })
})
