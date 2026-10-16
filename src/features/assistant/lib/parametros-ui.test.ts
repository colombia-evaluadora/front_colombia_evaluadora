import { describe, expect, it } from "vitest"

import { construirParametros } from "@/features/assistant/lib/parametros-ui"

describe("construirParametros", () => {
  it("aplana escalares, une listas y descarta lo inválido", () => {
    expect(
      construirParametros(
        { sede: 12, page: 2, actividad: "42", "1mal": "x", obj: { a: 1 }, vacio: "" },
        { estados: ["ACTIVO", "RETIRADO"], sede: 99, activo: true },
      ),
    ).toEqual({ sede: 12, actividad: "42", estados: "ACTIVO,RETIRADO", activo: true })
  })

  it("respeta el máximo de 30 y recorta valores largos", () => {
    const muchos = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i]))
    expect(Object.keys(construirParametros(muchos))).toHaveLength(30)
    expect(String(construirParametros({ t: "x".repeat(300) }).t)).toHaveLength(200)
  })
})
